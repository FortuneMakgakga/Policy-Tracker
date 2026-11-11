import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';
import { MapPin } from 'lucide-react';

export default function ClientJobRequest() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    address: '',
    province: '',
    skill_required: '',
    job_description: '',
    appointment_time: '',
    latitude: '',
    longitude: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        toast.success('Location captured');
      },
      () => toast.error('Failed to get location')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.client_name ||
      !formData.client_phone ||
      !formData.skill_required ||
      !formData.address ||
      !formData.province
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const clientId = localStorage.getItem('clientId');
      const payload = {
        client_id: clientId ? Number(clientId) : undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        job_description: formData.job_description,
        skill_required: formData.skill_required,
        appointment_time: formData.appointment_time || new Date().toISOString(),
        province: formData.province,
        address: formData.address,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
      };

      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit service request.');
        return;
      }
      toast.success('Request submitted');
      setSubmitted(true);
      setFormData({
        client_name: '',
        client_phone: '',
        address: '',
        province: '',
        skill_required: '',
        job_description: '',
        appointment_time: '',
        latitude: '',
        longitude: '',
      });
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'bg-[#f6f6f6] border-black/10 text-black placeholder:text-[#9a9a9a] rounded-xl h-12';

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-lg bg-white border-black/5 rounded-2xl ha-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-black">
            Request a repair
          </CardTitle>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Tell us what you need — we will match you with a nearby pro.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-[#e11900] text-sm mb-4 bg-red-50 border border-red-100 p-3 rounded-xl">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="client_name" placeholder="Full name *" value={formData.client_name} onChange={handleChange} className={fieldClass} />
            <Input name="client_phone" placeholder="Phone *" value={formData.client_phone} onChange={handleChange} className={fieldClass} />
            <Input name="address" placeholder="Address *" value={formData.address} onChange={handleChange} className={fieldClass} />
            <Input name="province" placeholder="Province *" value={formData.province} onChange={handleChange} className={fieldClass} />
            <Input name="skill_required" placeholder="Service type * (e.g. Plumbing)" value={formData.skill_required} onChange={handleChange} className={fieldClass} />
            <Textarea name="job_description" placeholder="Describe the problem" value={formData.job_description} onChange={handleChange} className={`${fieldClass} min-h-[100px]`} />
            <Input type="datetime-local" name="appointment_time" value={formData.appointment_time} onChange={handleChange} className={fieldClass} />
            <div className="flex gap-2">
              <Input name="latitude" placeholder="Latitude" value={formData.latitude} onChange={handleChange} className={fieldClass} />
              <Input name="longitude" placeholder="Longitude" value={formData.longitude} onChange={handleChange} className={fieldClass} />
            </div>
            <Button type="button" variant="outline" onClick={handleGetLocation} className="w-full">
              <MapPin className="w-4 h-4" />
              Use my location
            </Button>
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? 'Submitting...' : 'Confirm request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent className="bg-white border-black/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Request submitted</DialogTitle>
          </DialogHeader>
          <p className="text-[#6b6b6b]">We are matching you with a nearby technician.</p>
          <DialogFooter>
            <Button onClick={() => setSubmitted(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
