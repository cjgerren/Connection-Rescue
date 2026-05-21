
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TravelerProvider } from "@/contexts/TravelerContext";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BookingCancelled = lazy(() => import("./pages/BookingCancelled"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminSms = lazy(() => import("./pages/AdminSms"));
const AdminRescues = lazy(() => import("./pages/AdminRescues"));
const AdminTeam = lazy(() => import("./pages/AdminTeam"));
const AdminAudit = lazy(() => import("./pages/AdminAudit"));
const AirportManual = lazy(() => import("./pages/AirportManual"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TravelerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="/booking-cancelled" element={<BookingCancelled />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/sms" element={<AdminSms />} />
                <Route path="/admin/rescues" element={<AdminRescues />} />
                <Route path="/admin/team" element={<AdminTeam />} />
                <Route path="/admin/audit" element={<AdminAudit />} />
                <Route path="/airport-manual" element={<AirportManual />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TravelerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
