import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const API_BASE =
  "https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev";

export default function RegisterClient() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    province: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.address ||
      !form.province ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/client/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          client_name: form.name, // backend safety
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
          province: form.province,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      // ✅ Store client info for later use
      if (data.client_id) {
        localStorage.setItem("clientId", data.client_id.toString());
      }

      localStorage.setItem("clientName", form.name);
      localStorage.setItem("clientPhone", form.phone);

      setSuccess("Account created successfully.");

      setTimeout(() => {
        navigate("/login-client");
      }, 1000);
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-white">
            Create Your Home Assist Account
          </CardTitle>
          <p className="text-center text-gray-400 text-sm">
            Book repairs, track jobs, and connect with trusted service providers.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">Full Name</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Email Address</Label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Phone Number</Label>
              <Input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="071 234 5678"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Home Address</Label>
              <Input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Example Street, Johannesburg"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Province</Label>
              <Input
                name="province"
                value={form.province}
                onChange={handleChange}
                placeholder="e.g. Gauteng"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Password</Label>
              <Input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Confirm Password</Label>
              <Input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="text-center text-gray-400 text-sm mt-4">
              Already have an account?{" "}
              <Link to="/login-client" className="text-blue-400 hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}