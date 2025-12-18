import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { saveJobRequest } from "@/utils/jobStorage";

export default function ClientJobRequest() {
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    address: "",
    service_type: "",
    description: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.client_name || !formData.client_phone || !formData.service_type || !formData.address) {
      setError("Please fill in all required fields.");
      return;
    }

    const newJob = {
      id: `JOB-${Date.now()}`,
      ...formData,
      stage: "requested",
      status: "Requested",
      appointment_time: new Date().toISOString(),
      timeline: [
        {
          stage: "requested",
          label: "Job Requested",
          timestamp: new Date().toISOString(),
          completed: true,
          current: true,
        },
      ],
    };

    saveJobRequest(newJob);
    setSubmitted(true);
    setError("");
    setFormData({
      client_name: "",
      client_phone: "",
      address: "",
      service_type: "",
      description: "",
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Submit a Service Request
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded-md">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client_name">Full Name *</Label>
              <Input
                id="client_name"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                placeholder="e.g. David Brown"
                required
              />
            </div>

            <div>
              <Label htmlFor="client_phone">Phone Number *</Label>
              <Input
                id="client_phone"
                name="client_phone"
                type="tel"
                value={formData.client_phone}
                onChange={handleChange}
                placeholder="+27 82 234 5678"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Oak Avenue, Sandton, Johannesburg"
                required
              />
            </div>

            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Input
                id="service_type"
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                placeholder="e.g. Plumbing Repair"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the issue briefly..."
              />
            </div>

            <CardFooter className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                Submit Request
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Submitted</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mt-2">
            Your service request has been submitted successfully. A provider will be assigned shortly.
          </p>
          <DialogFooter className="mt-4">
            <Button onClick={() => setSubmitted(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
