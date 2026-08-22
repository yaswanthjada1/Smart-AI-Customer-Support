import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  Shield,
  Truck,
  RotateCcw,
  Star,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const WidgetTestPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCompanyId = searchParams.get('companyId') || 'caa160ac-4a09-417b-aa95-c7c0f9d830d8';
  const [companyIdInput, setCompanyIdInput] = useState(initialCompanyId);
  const [activeCompanyId, setActiveCompanyId] = useState(initialCompanyId);

  // Dynamically load widget script on host page
  useEffect(() => {
    // Remove existing widget if any
    const existingScript = document.getElementById('aerorag-test-script');
    if (existingScript) existingScript.remove();

    const existingRoot = document.getElementById('aerorag-root');
    if (existingRoot) existingRoot.remove();

    // Reset global init flag
    // @ts-ignore
    window.__AERORAG_WIDGET_INITIALIZED__ = false;

    // Create and append widget script
    const script = document.createElement('script');
    script.id = 'aerorag-test-script';
    script.src = '/widget.js';
    script.setAttribute('data-company-id', activeCompanyId);
    document.body.appendChild(script);

    return () => {
      const s = document.getElementById('aerorag-test-script');
      if (s) s.remove();
      const r = document.getElementById('aerorag-root');
      if (r) r.remove();
    };
  }, [activeCompanyId]);

  const handleUpdateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyIdInput.trim()) {
      setActiveCompanyId(companyIdInput.trim());
      setSearchParams({ companyId: companyIdInput.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Top Demo Banner */}
      <header className="sticky top-0 z-50 bg-slate-900 px-4 py-2.5 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Host Website Simulation</span>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
              Isolated Iframe Architecture
            </span>
          </div>

          <form onSubmit={handleUpdateCompany} className="flex items-center space-x-2">
            <span className="text-slate-400">Active Company ID:</span>
            <input
              type="text"
              value={companyIdInput}
              onChange={(e) => setCompanyIdInput(e.target.value)}
              className="w-56 rounded-md bg-slate-800 px-2.5 py-1 text-slate-100 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-[11px]"
              placeholder="Enter Company UUID"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500 transition"
            >
              Reload Widget
            </button>
          </form>
        </div>
      </header>

      {/* Simulated Store Navigation */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              AF
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">AeroFit</span>
              <span className="ml-1 text-xs font-semibold text-indigo-600 uppercase tracking-widest">
                Official Store
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#treadmills" className="hover:text-indigo-600 transition">
              Treadmills
            </a>
            <a href="#audio" className="hover:text-indigo-600 transition">
              Wireless Audio
            </a>
            <a href="#policy" className="hover:text-indigo-600 transition">
              Warranty & Returns
            </a>
            <a href="#support" className="hover:text-indigo-600 transition">
              Customer Support
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
              <ShoppingBag className="h-4 w-4" />
              <span>Cart (0)</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Store Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-900 py-16 px-6 text-white text-center relative overflow-hidden">
        <div className="mx-auto max-w-4xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium backdrop-blur-md text-indigo-200 border border-white/15">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span>Spring 2026 Fitness & Audio Collection</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            High-Performance Equipment & Premium Sound
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300">
            Experience next-generation workout treadmills and studio-grade wireless noise-canceling headphones engineered for daily endurance.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#products"
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition"
            >
              Explore Products
            </a>
            <a
              href="/dashboard"
              className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition border border-white/15"
            >
              Back to AeroRAG Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y border-slate-200 bg-white py-6 px-6">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">30-Day Money-Back Guarantee</h3>
              <p className="text-xs text-slate-500">Hassle-free returns within 30 days of delivery</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2-Year Treadmill Warranty</h3>
              <p className="text-xs text-slate-500">Full warranty covering frame, motor, and console</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start space-x-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fast Global Shipping</h3>
              <p className="text-xs text-slate-500">Same-day dispatch for orders placed before 2 PM EST</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section id="products" className="py-12 px-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Featured Equipment</h2>
          <p className="text-xs text-slate-500">Ask the AI support assistant on the bottom-right for exact specs, return rules, or warranty information.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Product 1 */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="h-44 w-full rounded-xl bg-slate-100 flex items-center justify-center text-4xl mb-4">
              🏃‍♂️
            </div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Treadmill
              </span>
              <div className="flex items-center text-amber-500 text-xs">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="ml-1 font-bold text-slate-700">4.9 (128)</span>
              </div>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900">AeroFit RunPro T100 Treadmill</h3>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              3.5 CHP WhisperQuiet motor, 0-15% motorized incline, 10-inch HD display, and EasyLift hydraulic assist folding.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Pricing varies by dealer</span>
              <span className="font-semibold text-emerald-600">2-Year Warranty</span>
            </div>
          </div>

          {/* Product 2 */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="h-44 w-full rounded-xl bg-slate-100 flex items-center justify-center text-4xl mb-4">
              🎧
            </div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                Audio
              </span>
              <div className="flex items-center text-amber-500 text-xs">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="ml-1 font-bold text-slate-700">4.8 (340)</span>
              </div>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900">AeroFit Pro Wireless Headphones</h3>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              40mm dynamic drivers, up to 30 hours battery life, active noise cancellation (ANC), and IPX7 sweat resistance.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Fast fuel 10m charge = 4h</span>
              <span className="font-semibold text-indigo-600">1-Year Warranty</span>
            </div>
          </div>

          {/* Product 3 */}
          <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="h-44 w-full rounded-xl bg-slate-100 flex items-center justify-center text-4xl mb-4">
              🛡️
            </div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                Policy
              </span>
              <span className="text-xs text-slate-400">AF-POL-RET-2026</span>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900">Customer Support Guarantee</h3>
            <p className="mt-1 text-xs text-slate-500">
              Have questions about your order, shipping timeline, or return eligibility? Click the floating chat assistant at the bottom right.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-600 font-semibold flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Live AI Ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Callout Pointer */}
      <div className="fixed bottom-24 right-24 z-40 hidden sm:flex items-center space-x-2 rounded-xl bg-slate-900/90 text-white px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-sm border border-slate-700 animate-bounce">
        <span>👈 Click the floating button to test live embedded RAG</span>
      </div>
    </div>
  );
};
