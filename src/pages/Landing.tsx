import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wrench, ShieldCheck, Clock, MapPin, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '@/auth/RoleProvider';

export default function Landing() {
  const navigate = useNavigate();
  const { role } = useRole();

  useEffect(() => {
    if (role) navigate(`/${role}`, { replace: true });
  }, [role, navigate]);

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black flex flex-col">
      <header className="w-full bg-white border-b border-black/5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">Home Assist</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login-client"
              className="text-sm font-medium text-black/70 hover:text-black px-3 py-2 hidden sm:inline"
            >
              Log in
            </Link>
            <Link to="/register-client">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
              Home repairs,
              <br />
              on demand
            </h1>
            <p className="text-lg text-[#6b6b6b] mb-8 max-w-md leading-relaxed">
              Request a vetted technician in minutes. Track them live. Pay when the job is done.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register-client" className="sm:flex-1 sm:max-w-[220px]">
                <Button size="lg" className="w-full">
                  Request help
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/register-sp" className="sm:flex-1 sm:max-w-[220px]">
                <Button size="lg" variant="outline" className="w-full">
                  Drive jobs
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid sm:grid-cols-3 gap-4">
            {[
              { icon: Clock, title: 'Fast dispatch', body: 'Matched with nearby pros as soon as you request.' },
              { icon: MapPin, title: 'Live tracking', body: 'See your technician on the map until they arrive.' },
              { icon: Star, title: 'Trusted pros', body: 'Rated providers with clear quotes before work starts.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="ha-card p-5">
                <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-semibold text-base mb-1">{title}</h3>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border-y border-black/5">
          <div className="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-[#f6f6f6] p-6 flex flex-col">
              <h3 className="text-xl font-bold mb-2">I need a repair</h3>
              <p className="text-sm text-[#6b6b6b] mb-6 flex-1">
                Plumbing, electrical, general fixes — request a job and get quotes fast.
              </p>
              <Link to="/login-client">
                <Button className="w-full">Client log in</Button>
              </Link>
            </div>

            <div className="rounded-2xl bg-[#f6f6f6] p-6 flex flex-col">
              <h3 className="text-xl font-bold mb-2">I do the work</h3>
              <p className="text-sm text-[#6b6b6b] mb-6 flex-1">
                Accept nearby jobs, update status live, and get paid for completed work.
              </p>
              <Link to="/login-sp">
                <Button className="w-full">Provider log in</Button>
              </Link>
            </div>

            <div className="rounded-2xl bg-black text-white p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-xl font-bold">Staff</h3>
              </div>
              <p className="text-sm text-white/70 mb-6 flex-1">
                Approve quotes, monitor jobs, and manage the network.
              </p>
              <Link to="/login-admin">
                <Button variant="secondary" className="w-full bg-white text-black hover:bg-white/90">
                  Staff log in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-[#6b6b6b]">
        © {new Date().getFullYear()} Home Assist
      </footer>
    </div>
  );
}
