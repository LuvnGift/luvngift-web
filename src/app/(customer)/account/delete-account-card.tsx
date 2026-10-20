'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteAccount } from '@/hooks/use-user';

interface Props {
  /** False for Google-only accounts, which have no password to re-enter. */
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}

/**
 * Self-service account deletion (App Store 5.1.1(v) / Google Play). The API
 * enforces every rule; this collects what it needs and shows its refusals
 * (open subscription, gift in transit, admin account) verbatim.
 */
export function DeleteAccountCard({ hasPassword, twoFactorEnabled }: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const deleteAccount = useDeleteAccount();

  const ready =
    confirm === 'DELETE'
    && (!hasPassword || password.length > 0)
    && (!twoFactorEnabled || /^\d{6}$/.test(totpCode));

  const close = (next: boolean) => {
    if (deleteAccount.isPending) return;
    setOpen(next);
    if (!next) {
      setConfirm('');
      setPassword('');
      setTotpCode('');
      deleteAccount.reset();
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    deleteAccount.mutate({
      confirm: 'DELETE',
      ...(hasPassword ? { password } : {}),
      ...(twoFactorEnabled ? { totpCode } : {}),
    });
  };

  const errorMessage: string | undefined = deleteAccount.error
    ? deleteAccount.error?.response?.data?.error?.message ?? 'Could not delete your account. Please try again.'
    : undefined;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently delete your account, saved addresses, saved cards and chat history. This
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                Delete your account?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Your profile, saved addresses, saved cards and chat history will be deleted and
                    you will be signed out. You will not be able to sign in again.
                  </p>
                  <p>
                    Records of past orders and payments are kept only as long as tax law requires.
                    If you have a subscription or a gift on its way, finish or cancel it first.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            {hasPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {twoFactorEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="delete-totp">Authenticator code</Label>
                <Input
                  id="delete-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.trim())}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
                disabled={deleteAccount.isPending}
              >
                Keep my account
              </Button>
              <Button type="submit" variant="destructive" disabled={!ready || deleteAccount.isPending}>
                {deleteAccount.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
