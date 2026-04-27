
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { TravelerProvider } from "@/contexts/TravelerContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import DataDeletion from "./pages/DataDeletion";
import About from "./pages/About";
import Contact from "./pages/Contact";
import BookingSuccess from "./pages/BookingSuccess";
import BookingCancelled from "./pages/BookingCancelled";
import Alerts from "./pages/Alerts";
import Admin from "./pages/Admin";
import AdminSms from "./pages/AdminSms";
import AdminRescues from "./pages/AdminRescues";
import AdminTeam from "./pages/AdminTeam";
import AdminAudit from "./pages/AdminAudit";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TravelerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TravelerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
