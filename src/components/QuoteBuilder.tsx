import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

interface Part {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

interface QuoteBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: string;
  jobId: string;
  onQuoteCreated: (job: any) => void;
}

export function QuoteBuilder({
  open,
  onOpenChange,
  serviceType,
  jobId,
  onQuoteCreated
}: QuoteBuilderProps) {
  const [callOutFee, setCallOutFee] = useState(350);
  const [laborHours, setLaborHours] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(450);
  const [diagnosticFee, setDiagnosticFee] = useState(serviceType === 'Electrical' ? 200 : 0);
  const [complianceTestFee, setComplianceTestFee] = useState(serviceType === 'Electrical' ? 450 : 0);
  const [parts, setParts] = useState<Part[]>([
    { name: '', qty: 1, unit_price: 0, total: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const addPart = () => {
    setParts([...parts, { name: '', qty: 1, unit_price: 0, total: 0 }]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof Part, value: string | number) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };

    if (field === 'qty' || field === 'unit_price') {
      newParts[index].total = Number(newParts[index].qty) * Number(newParts[index].unit_price);
    }

    setParts(newParts);
  };

  const calculateTotals = () => {
    const laborTotal = laborHours * hourlyRate;
    const partsTotal = parts.reduce((sum, part) => sum + part.total, 0);
    const subtotal = callOutFee + laborTotal + partsTotal + diagnosticFee + complianceTestFee;
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;

    return { subtotal, vatAmount, total, laborTotal, partsTotal };
  };

  const buildDetailsString = () => {
    const totals = calculateTotals();
    const validParts = parts.filter((p) => p.name && p.total > 0);

    const lines: string[] = [
      `Service Type: ${serviceType}`,
      `Call-out Fee: R ${callOutFee.toFixed(2)}`,
      `Labour: ${laborHours} hour(s) @ R ${hourlyRate.toFixed(2)} = R ${totals.laborTotal.toFixed(2)}`
    ];

    if (diagnosticFee > 0) {
      lines.push(`Diagnostic Fee: R ${diagnosticFee.toFixed(2)}`);
    }

    if (complianceTestFee > 0) {
      lines.push(`Compliance Test Fee: R ${complianceTestFee.toFixed(2)}`);
    }

    if (validParts.length > 0) {
      lines.push('Parts & Materials:');
      validParts.forEach((part, index) => {
        lines.push(
          `${index + 1}. ${part.name} | Qty: ${part.qty} | Unit: R ${part.unit_price.toFixed(
            2
          )} | Total: R ${part.total.toFixed(2)}`
        );
      });
    }

    lines.push(`Subtotal: R ${totals.subtotal.toFixed(2)}`);
    lines.push(`VAT (15%): R ${totals.vatAmount.toFixed(2)}`);
    lines.push(`Total: R ${totals.total.toFixed(2)}`);

    if (notes.trim()) {
      lines.push(`Notes: ${notes.trim()}`);
    }

    return lines.join('\n');
  };

  const handleSaveQuote = async () => {
    const totals = calculateTotals();

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          total_amount: totals.total,
          details: buildDetailsString()
        })
      });

      if (!res.ok) {
        let message = 'Failed to create quote';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const updatedJob = await res.json();

      toast.success('Quote created successfully');
      onQuoteCreated(updatedJob);
      onOpenChange(false);
      setShowPreview(false);
    } catch (error) {
      console.error('Quote creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create quote');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (showPreview) {
    return (
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setShowPreview(false);
            onOpenChange(false);
          }
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Quote Preview</DialogTitle>
          </DialogHeader>

          <div className="bg-white text-black p-8 rounded-lg">
            <div className="mb-8">
              <h1 className="text-3xl mb-2">Home Assist</h1>
              <p className="text-gray-600">Professional Home Repair Services</p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl mb-4">QUOTATION</h2>
              <p className="text-gray-600">Job ID: {jobId}</p>
              <p className="text-gray-600">Date: {new Date().toLocaleDateString('en-ZA')}</p>
              <p className="text-gray-600">
                Valid Until: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA')}
              </p>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-2">Call-out Fee</td>
                  <td className="text-right">1</td>
                  <td className="text-right">R {callOutFee.toFixed(2)}</td>
                  <td className="text-right">R {callOutFee.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2">Labour</td>
                  <td className="text-right">{laborHours}</td>
                  <td className="text-right">R {hourlyRate.toFixed(2)}</td>
                  <td className="text-right">R {totals.laborTotal.toFixed(2)}</td>
                </tr>

                {diagnosticFee > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="py-2">Diagnostic Fee</td>
                    <td className="text-right">1</td>
                    <td className="text-right">R {diagnosticFee.toFixed(2)}</td>
                    <td className="text-right">R {diagnosticFee.toFixed(2)}</td>
                  </tr>
                )}

                {complianceTestFee > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="py-2">Compliance Test</td>
                    <td className="text-right">1</td>
                    <td className="text-right">R {complianceTestFee.toFixed(2)}</td>
                    <td className="text-right">R {complianceTestFee.toFixed(2)}</td>
                  </tr>
                )}

                {parts
                  .filter((p) => p.name && p.total > 0)
                  .map((part, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-2">{part.name}</td>
                      <td className="text-right">{part.qty}</td>
                      <td className="text-right">R {part.unit_price.toFixed(2)}</td>
                      <td className="text-right">R {part.total.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="py-2 text-right">Subtotal:</td>
                  <td className="text-right">R {totals.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right">VAT (15%):</td>
                  <td className="text-right">R {totals.vatAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-gray-300">
                  <td colSpan={3} className="py-2 text-right"><strong>Total:</strong></td>
                  <td className="text-right"><strong>R {totals.total.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>

            {notes && (
              <div className="mb-6">
                <h3 className="mb-2">Notes:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button onClick={handleSaveQuote} disabled={saving}>
              {saving ? 'Saving...' : 'Save Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setShowPreview(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Create Quote - {serviceType}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Build a detailed quotation for this job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Call-out Fee (R)</Label>
              <Input
                type="number"
                value={callOutFee}
                onChange={(e) => setCallOutFee(Number(e.target.value))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Hourly Rate (R)</Label>
              <Input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Labor Hours</Label>
            <Input
              type="number"
              step="0.5"
              value={laborHours}
              onChange={(e) => setLaborHours(Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-gray-500 text-sm mt-1">
              Labor cost: R {(laborHours * hourlyRate).toFixed(2)}
            </p>
          </div>

          {serviceType === 'Electrical' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Diagnostic Fee (R)</Label>
                <Input
                  type="number"
                  value={diagnosticFee}
                  onChange={(e) => setDiagnosticFee(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Compliance Test Fee (R)</Label>
                <Input
                  type="number"
                  value={complianceTestFee}
                  onChange={(e) => setComplianceTestFee(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-gray-300">Parts & Materials</Label>
              <Button size="sm" variant="outline" type="button" onClick={addPart}>
                <Plus className="w-4 h-4 mr-1" />
                Add Part
              </Button>
            </div>

            <div className="space-y-3">
              {parts.map((part, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700 p-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <Input
                        placeholder="Part name"
                        value={part.name}
                        onChange={(e) => updatePart(index, 'name', e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={part.qty}
                        onChange={(e) => updatePart(index, 'qty', Number(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Unit price"
                        value={part.unit_price}
                        onChange={(e) => updatePart(index, 'unit_price', Number(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-white text-sm">R {part.total.toFixed(2)}</span>
                      {parts.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          onClick={() => removePart(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              placeholder="Add any additional notes or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>

          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>R {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>VAT (15%)</span>
                <span>R {totals.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white border-t border-gray-700 pt-2">
                <span>Total</span>
                <span>R {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" type="button" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button type="button" onClick={handleSaveQuote} disabled={saving}>
            {saving ? 'Saving...' : 'Save Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
