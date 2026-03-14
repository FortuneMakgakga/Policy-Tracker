"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function SPRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    province: "",
    skill: "",
    latitude: "",
    longitude: "",
    password: "",
    confirmPassword: "",
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
      !form.province ||
      !form.skill ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev/api/sp/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          province: form.province,
          skill: form.skill,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      setSuccess("Service provider registered successfully.");
      localStorage.setItem("userRole", "sp");

      setTimeout(() => {
        navigate("/login-sp");
      }, 1000);
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <Card className="w-full max-w-2xl shadow-xl p-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Service Provider Registration
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@mail.com"
                  required
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="072 123 4567"
                  required
                />
              </div>

              <div>
                <Label>Province</Label>
                <Input
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  placeholder="Gauteng"
                  required
                />
              </div>

              <div>
                <Label>Skill</Label>
                <Input
                  name="skill"
                  value={form.skill}
                  onChange={handleChange}
                  placeholder="Plumber"
                  required
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label>Latitude</Label>
                <Input
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="-26.2041"
                />
              </div>

              <div>
                <Label>Longitude</Label>
                <Input
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="28.0473"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            <Button type="submit" className="w-full mt-6 py-3 text-lg rounded-xl" disabled={loading}>
              {loading ? "Registering..." : "Register Service Provider"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}