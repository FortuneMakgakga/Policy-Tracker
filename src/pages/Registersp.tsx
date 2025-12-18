"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectItem, SelectValue, SelectContent } from "@/components/ui/select";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default function SPRegisterPage() {
  const [businessType, setBusinessType] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <Card className="w-full max-w-3xl shadow-xl p-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Service Provider Registration</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="grid grid-cols-1 gap-6">
            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input placeholder="John Doe" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="example@mail.com" required />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input placeholder="072 123 4567" required />
              </div>
            </div>

            {/* Business Type */}
            <div>
              <Label>Business Type</Label>
              <Select onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole">Sole Proprietor</SelectItem>
                  <SelectItem value="pty">Pty Ltd</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corp">Corporation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Details */}
            {businessType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input placeholder="ABC Repairs" required />
                </div>
                <div>
                  <Label>VAT Number (10 digits, starts with 4)</Label>
                  <Input
                    placeholder="4XXXXXXXXX"
                    pattern="4[0-9]{9}"
                    title="VAT number must be 10 digits and start with 4"
                    required
                  />
                </div>
              </div>
            )}

            {/* DOCUMENT UPLOADS */}
            <div className="space-y-4 mt-2">
              <Label className="font-semibold">Required Uploads</Label>

              {/* ID Document */}
              <div>
                <Label>Identity Document</Label>
                <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer bg-white shadow-sm">
                  <Upload className="w-5 h-5" />
                  <span>Upload ID Document (PDF/JPG/PNG)</span>
                  <input type="file" className="hidden" required />
                </label>
              </div>

              {/* Tax Compliance */}
              <div>
                <Label>Tax Clearance / Compliance</Label>
                <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer bg-white shadow-sm">
                  <Upload className="w-5 h-5" />
                  <span>Upload Tax Document</span>
                  <input type="file" className="hidden" required />
                </label>
              </div>

              {/* Business Type-specific Documents */}
              {businessType !== "sole" && (
                <div>
                  <Label>Company Registration Documents</Label>
                  <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer bg-white shadow-sm">
                    <Upload className="w-5 h-5" />
                    <span>Upload CIPC / Registration Files</span>
                    <input type="file" className="hidden" required />
                  </label>
                </div>
              )}

              {/* Proof of Payment (Mandatory for ALL business types) */}
              <div>
                <Label>Proof of Payment (Mandatory)</Label>
                <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer bg-white shadow-sm">
                  <Upload className="w-5 h-5" />
                  <span>Upload Proof of Payment</span>
                  <input type="file" className="hidden" required />
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6 py-3 text-lg rounded-xl">
              Register Service Provider
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
