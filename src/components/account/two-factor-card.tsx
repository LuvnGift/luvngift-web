'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

type Props = {
  enabled: boolean;
  /** Extra line under the title, e.g. why an admin needs it. */
  description?: string;
};

type Setup = { qrCode: string; secret: string };

function apiMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message ?? fallback;
}

/**
 * Turn TOTP two-factor on or off for the signed-in user. Shared by the customer
 * account page and the admin profile, so there is one implementation of it.
 */
export function TwoFactorCard({ enabled, description }: Props) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<'setup' | 'disable' | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { setDialog(null); setCode(''); };

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post('/api/v1/auth/2fa/setup');
      setSetup(res.data.data);
      setCode('');
      setDialog('setup');
    } catch (err) {
      toast.error(apiMessage(err, 'Could not start 2FA setup. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const action = dialog === 'setup' ? 'verify' : 'disable';
    setBusy(true);
    try {
      await api.post(`/api/v1/auth/2fa/${action}`, { token: code });
      toast.success(action === 'verify' ? '2FA enabled.' : '2FA disabled.');
      close();
      setSetup(null);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      toast.error(apiMessage(err, 'That code did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {enabled ? '2FA is on for your account.' : 'Add an extra layer of security to your account.'}
          {description && <span className="mt-1 block">{description}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <Button variant="destructive" onClick={() => { setCode(''); setDialog('disable'); }}>
            Disable 2FA
          </Button>
        ) : (
          <Button onClick={startSetup} disabled={busy}>
            {busy && !dialog ? 'Starting…' : 'Enable 2FA'}
          </Button>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === 'setup' ? 'Set up 2FA' : 'Disable 2FA'}</DialogTitle>
            <DialogDescription>
              {dialog === 'setup'
                ? 'Scan the QR code with your authenticator app, then enter the 6-digit code to verify.'
                : 'Enter the 6-digit code from your authenticator app to confirm.'}
            </DialogDescription>
          </DialogHeader>
          {dialog === 'setup' && setup && (
            <div className="flex flex-col items-center gap-2 py-2">
              <img src={setup.qrCode} alt="2FA QR code" className="h-48 w-48" />
              <div className="w-full space-y-1">
                <p className="text-center text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this code manually in your app:
                </p>
                <p className="select-all break-all rounded bg-muted px-3 py-2 text-center font-mono text-xs tracking-widest">
                  {setup.secret}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="two-factor-code">Verification code</Label>
              <Input
                id="two-factor-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <Button
              className="w-full"
              variant={dialog === 'disable' ? 'destructive' : 'default'}
              disabled={code.length !== 6 || busy}
              onClick={confirm}
            >
              {dialog === 'setup' ? 'Verify & enable' : 'Confirm disable'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
