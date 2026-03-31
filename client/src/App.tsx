import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import NewLoan from "./pages/NewLoan";
import Payments from "./pages/Payments";
import Penalties from "./pages/Penalties";
import Documents from "./pages/Documents";
import Consents from "./pages/Consents";
import Audit from "./pages/Audit";
import Collections from "./pages/Collections";
import Settings from "./pages/Settings";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/loans" component={Loans} />
      <Route path="/loans/new" component={NewLoan} />
      <Route path="/loans/:id" component={LoanDetail} />
      <Route path="/payments" component={Payments} />
      <Route path="/penalties" component={Penalties} />
      <Route path="/documents" component={Documents} />
      <Route path="/consents" component={Consents} />
      <Route path="/collections" component={Collections} />
      <Route path="/audit" component={Audit} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
