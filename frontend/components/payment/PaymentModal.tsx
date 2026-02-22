"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wallet, CheckCircle2, XCircle, ExternalLink, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/use-toast"
import { PaymentAgreementModal } from "./PaymentAgreementModal"
import { getTxExplorerUrl } from "@/lib/onechain"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  toolName: string
  toolDisplayName: string
  price: string // OCT amount, e.g., "0.25"
  agentId?: string
  onPaymentSuccess?: (paymentHash: string, executionToken: string) => void
  onPaymentError?: (error: string) => void
}

type PaymentStatus = "idle" | "paying" | "verifying" | "success" | "error"

export function PaymentModal({
  open,
  onOpenChange,
  toolName,
  toolDisplayName,
  price,
  agentId,
  onPaymentSuccess,
  onPaymentError,
}: PaymentModalProps) {
  const { user, authenticated } = useAuth()

  const [status, setStatus] = useState<PaymentStatus>("idle")
  const [error, setError] = useState<string>("")
  const [txHash, setTxHash] = useState<string>("")
  const [executionToken, setExecutionToken] = useState<string>("")
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(false)
  const [showAgreementModal, setShowAgreementModal] = useState(false)

  useEffect(() => {
    if (open && authenticated && user) {
      checkPaymentAgreement()
    }
  }, [open, authenticated, user])

  const checkPaymentAgreement = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`/api/payments/agreement?userId=${user.id}&version=v1.0`)
      const data = await response.json()
      setHasAgreedToTerms(data.hasAgreed || false)
    } catch (error) {
      console.error("Error checking payment agreement:", error)
    }
  }

  /**
   * Payment on OneChain is handled server-side by the backend which holds
   * the agent's keypair. We call /api/payments/execute which builds a
   * PTB transferring OCT to the escrow and returns the digest.
   */
  const handlePayment = async () => {
    if (!authenticated || !user?.id) {
      setError("Please connect your wallet first")
      setStatus("error")
      return
    }

    if (!hasAgreedToTerms) {
      setError("Please accept payment terms first")
      setStatus("error")
      return
    }

    setStatus("paying")
    setError("")

    try {
      const payResponse = await fetch("/api/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, agentId: agentId || null, toolName, octAmount: price }),
      })

      if (!payResponse.ok) {
        const err = await payResponse.json()
        throw new Error(err.error || "Payment failed")
      }

      const payData = await payResponse.json()
      setTxHash(payData.digest ?? "")

      // Verify payment
      setStatus("verifying")
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentHash: payData.digest, userId: user.id, agentId: agentId || null, toolName }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || "Payment verification failed")
      }

      const verifyData = await verifyResponse.json()
      setExecutionToken(verifyData.executionToken)
      setStatus("success")

      toast({ title: "Payment Successful!", description: `${price} OCT transferred on OneChain.` })
      onPaymentSuccess?.(payData.digest, verifyData.executionToken)
    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
      setStatus("error")
      onPaymentError?.(err.message)
    }
  }

  const handleClose = () => {
    if (!["paying", "verifying"].includes(status)) {
      onOpenChange(false)
      setTimeout(() => { setStatus("idle"); setError(""); setTxHash(""); setExecutionToken("") }, 300)
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "paying":    return "Processing payment on OneChain..."
      case "verifying": return "Verifying payment..."
      case "success":   return "Payment successful!"
      case "error":     return "Payment failed"
      default:          return ""
    }
  }

  const isProcessing = ["paying", "verifying"].includes(status)
  const canPay = status === "idle" && authenticated && hasAgreedToTerms

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pay for Tool Usage</DialogTitle>
          <DialogDescription>
            Complete payment to use <strong>{toolDisplayName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">{price} OCT</p>
            </div>
            <Badge variant="secondary">OneChain Testnet</Badge>
          </div>

          {/* Wallet Status */}
          {!authenticated ? (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>Please connect your wallet to continue</AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Address</span>
              <span className="font-mono">{user?.id?.slice(0, 6)}...{user?.id?.slice(-4)}</span>
            </div>
          )}

          {/* Terms Acceptance */}
          {!hasAgreedToTerms && authenticated && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You must accept the payment terms before making a payment.{" "}
                <Button variant="link" className="h-auto p-0 text-primary" onClick={() => setShowAgreementModal(true)}>
                  View Terms
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Messages */}
          {status !== "idle" && (
            <Alert variant={status === "success" ? "default" : status === "error" ? "destructive" : "default"}>
              {status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {status === "error" && <XCircle className="h-4 w-4" />}
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              <AlertDescription>
                {getStatusMessage()}
                {error && <div className="mt-2 text-sm">{error}</div>}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Link */}
          {txHash && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Transaction:</span>
              <a href={getTxExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline">
                {txHash.slice(0, 6)}...{txHash.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Payment is processed on OneChain using OCT</p>
            <p>• Automatic refund if service fails</p>
            <p>• 1 OCT = 1,000,000,000 MIST</p>
          </div>
        </div>

        <DialogFooter>
          {status === "success" ? (
            <Button onClick={handleClose} className="w-full">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handlePayment} disabled={!canPay || isProcessing}>
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  <><Wallet className="mr-2 h-4 w-4" />Pay {price} OCT</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      <PaymentAgreementModal
        open={showAgreementModal}
        onOpenChange={setShowAgreementModal}
        onAccepted={() => { setHasAgreedToTerms(true); checkPaymentAgreement() }}
      />
    </Dialog>
  )
}
