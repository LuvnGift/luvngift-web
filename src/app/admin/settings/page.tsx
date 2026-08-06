'use client';

import { useState, useEffect } from 'react';
import {
  useAdminExchangeRates,
  useUpdateExchangeRates,
  useDeliveryWindow,
  useUpdateDeliveryWindow,
} from '@/hooks/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminExchangeRates();
  const update = useUpdateExchangeRates();

  const [gbp, setGbp] = useState('');
  const [cad, setCad] = useState('');

  // Pre-fill inputs with current admin-set values when data loads
  useEffect(() => {
    if (!data) return;
    if (data.sources.GBP === 'admin') setGbp(String(data.GBP));
    if (data.sources.CAD === 'admin') setCad(String(data.CAD));
  }, [data]);

  const handleSave = () => {
    update.mutate({
      GBP: gbp ? parseFloat(gbp) : null,
      CAD: cad ? parseFloat(cad) : null,
    });
  };

  const handleClear = (currency: 'GBP' | 'CAD') => {
    if (currency === 'GBP') {
      setGbp('');
      update.mutate({ GBP: null });
    } else {
      setCad('');
      update.mutate({ CAD: null });
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage platform-wide configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exchange Rates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Override live rates with fixed values. Leave blank to use live rates from open.er-api.com.
            These rates control what buyers in Canada and the UK see as prices.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <>
              <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
                <p className="font-medium">Current effective rates (1 USD =)</p>
                <div className="flex gap-4 text-muted-foreground">
                  <span>
                    £{data?.GBP.toFixed(4)} GBP
                    <Badge variant={data?.sources.GBP === 'admin' ? 'default' : 'secondary'} className="ml-2 text-xs">
                      {data?.sources.GBP === 'admin' ? 'admin-set' : 'live'}
                    </Badge>
                  </span>
                  <span>
                    CA${data?.CAD.toFixed(4)} CAD
                    <Badge variant={data?.sources.CAD === 'admin' ? 'default' : 'secondary'} className="ml-2 text-xs">
                      {data?.sources.CAD === 'admin' ? 'admin-set' : 'live'}
                    </Badge>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GBP rate (1 USD = ? GBP)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder={`Live: ${data?.GBP.toFixed(4)}`}
                      value={gbp}
                      onChange={(e) => setGbp(e.target.value)}
                    />
                    {data?.sources.GBP === 'admin' && (
                      <Button variant="outline" size="sm" onClick={() => handleClear('GBP')}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CAD rate (1 USD = ? CAD)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder={`Live: ${data?.CAD.toFixed(4)}`}
                      value={cad}
                      onChange={(e) => setCad(e.target.value)}
                    />
                    {data?.sources.CAD === 'admin' && (
                      <Button variant="outline" size="sm" onClick={() => handleClear('CAD')}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: add 2–3% above the live rate to cover Stripe's currency conversion spread.
              </p>

              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? 'Saving...' : 'Save rates'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <DeliveryWindowCard />
    </div>
  );
}

/**
 * Controls the date range subscribers are promised for each recurring delivery.
 * Applies to cycles created from now on — deliveries already scheduled keep the
 * window they were given.
 */
function DeliveryWindowCard() {
  const { data, isLoading } = useDeliveryWindow();
  const update = useUpdateDeliveryWindow();

  // Not named `window` — that would shadow the global inside this component.
  const [lead, setLead] = useState('');
  const [windowLength, setWindowLength] = useState('');

  useEffect(() => {
    if (!data) return;
    setLead(String(data.leadDays));
    setWindowLength(String(data.windowDays));
  }, [data]);

  const leadNum = Number(lead);
  const windowNum = Number(windowLength);
  const valid =
    Number.isInteger(leadNum) && leadNum >= 0 && Number.isInteger(windowNum) && windowNum >= 1;

  // Mirrors the copy a subscriber sees in their cycle email.
  const preview = (() => {
    if (!valid) return null;
    const from = new Date();
    from.setDate(from.getDate() + leadNum);
    const to = new Date(from);
    to.setDate(to.getDate() + windowNum);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `${from.toLocaleDateString('en-GB', { day: 'numeric' })}–${to.toLocaleDateString('en-GB', opts)}`;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscription delivery window</CardTitle>
        <p className="text-sm text-muted-foreground">
          How long after a cycle is paid the delivery is promised. Subscribers see a range rather
          than a single date, so logistics delays don&apos;t read as a broken promise.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead time (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Days between payment and the earliest promised delivery.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Window length (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={windowLength}
                  onChange={(e) => setWindowLength(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How wide the promised range is. Minimum 1.
                </p>
              </div>
            </div>

            {preview && (
              <div className="rounded-md border p-3 bg-muted/40 text-sm">
                <p className="font-medium">A subscriber paying today would be told:</p>
                <p className="text-muted-foreground mt-1">
                  &ldquo;Expected to arrive <strong>{preview}</strong>.&rdquo;
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Defaults are {data?.defaults.leadDays} and {data?.defaults.windowDays} days. Changes
              apply to future cycles only — deliveries already scheduled keep their original
              window.
            </p>

            <Button
              onClick={() => update.mutate({ leadDays: leadNum, windowDays: windowNum })}
              disabled={update.isPending || !valid}
            >
              {update.isPending ? 'Saving...' : 'Save delivery window'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
