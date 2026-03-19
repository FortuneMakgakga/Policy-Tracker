import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRole } from "@/App";

export default function Landing() {
  const shapeBlue = useRef<HTMLDivElement>(null);
  const shapePurple = useRef<HTMLDivElement>(null);
  const shapeGreen = useRef<HTMLDivElement>(null);
  const gradient = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { role } = useRole();

  useEffect(() => {
    if (role) {
      navigate(`/${role}`, { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (shapeBlue.current) shapeBlue.current.style.transform = `translateY(${scrollY * 0.1}px)`;
      if (shapePurple.current) shapePurple.current.style.transform = `translateY(${scrollY * -0.05}px)`;
      if (shapeGreen.current) shapeGreen.current.style.transform = `translateY(${scrollY * 0.08}px)`;
      if (gradient.current) gradient.current.style.backgroundPosition = `${scrollY * 0.05}% 50%`;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-20">
        <div
          ref={shapeBlue}
          className="absolute w-72 h-72 bg-blue-600 rounded-full opacity-20 animate-pulse-slow -top-20 -left-20"
        />
        <div
          ref={shapePurple}
          className="absolute w-96 h-96 bg-purple-500 rounded-full opacity-15 animate-pulse-slow -bottom-32 -right-32"
        />
        <div
          ref={shapeGreen}
          className="absolute w-64 h-64 bg-green-500 rounded-full opacity-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"
        />

        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-10 w-1 h-1 animate-pulse-slow"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDuration: `${Math.random() * 6 + 4}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 -z-10">
        <div
          ref={gradient}
          className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 opacity-30 animate-gradient-background"
        />
      </div>

      <header className="w-full py-6 border-b border-gray-800 z-10 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-3 animate-fadeIn">
            <div className="bg-blue-500 p-3 rounded-xl shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-2xl">Home Assist</h1>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6 text-gray-300 animate-fadeIn delay-200">
            <Link to="/login-client" className="hover:text-white transition-colors">
              Client Login
            </Link>
            <Link to="/login-sp" className="hover:text-white transition-colors">
              Provider Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 animate-fadeInUp">
            Fast, Reliable Home Repairs in South Africa
          </h2>

          <p className="text-lg text-gray-300 mb-10 animate-fadeInUp delay-200">
            Connect with vetted, qualified service providers.
            Get instant quotes and track your repair job in real-time.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 animate-fadeInUp delay-400">
            <Link to="/register-client">
              <Button
                size="lg"
                className="px-10 py-6 text-lg transform transition-all hover:-translate-y-1 hover:scale-105 hover:rotate-1 hover:shadow-2xl"
              >
                I Need Help
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <Link to="/register-sp">
              <Button
                size="lg"
                variant="secondary"
                className="px-10 py-6 text-lg transform transition-all hover:-translate-y-1 hover:scale-105 hover:-rotate-1 hover:shadow-2xl"
              >
                I’m a Service Provider
              </Button>
            </Link>

            <Link to="/login-admin">
              <Button
                size="lg"
                variant="outline"
                className="px-10 py-6 text-lg border-gray-600 text-white hover:bg-gray-800 transform transition-all hover:-translate-y-1 hover:scale-105"
              >
                <ShieldCheck className="mr-2 w-5 h-5" />
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-6 border-t border-gray-800 text-center text-gray-500 text-sm animate-fadeIn delay-600 z-10 relative">
        © {new Date().getFullYear()} Home Assist — All Rights Reserved
      </footer>

      <style>
        {`
          .animate-fadeIn { opacity: 0; animation: fadeIn 1s forwards; }
          .animate-fadeInUp { opacity: 0; transform: translateY(20px); animation: fadeInUp 1s forwards; }
          .delay-200 { animation-delay: 0.2s; }
          .delay-400 { animation-delay: 0.4s; }
          .delay-600 { animation-delay: 0.6s; }

          @keyframes fadeIn { to { opacity: 1; } }
          @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

          .animate-pulse-slow {
            animation: pulseSlow 6s ease-in-out infinite alternate;
          }

          @keyframes pulseSlow {
            0% { transform: scale(0.95) translateY(0px); opacity: 0.15; }
            50% { transform: scale(1.05) translateY(10px); opacity: 0.25; }
            100% { transform: scale(0.95) translateY(0px); opacity: 0.15; }
          }

          .animate-gradient-background {
            background-size: 200% 200%;
            animation: gradientShift 15s ease infinite;
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </div>
  );
}