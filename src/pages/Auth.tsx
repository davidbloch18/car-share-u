import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Car } from "lucide-react";
import { IsraeliAcademicDomains } from "@/lib/israeliAcademicDomains";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, signIn, resetPassword } = useAuthViewModel();
  const [isLoading, setIsLoading] = useState<"signin" | "signup" | "reset" | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameRegex = /^[A-Za-z]{1,20}$/;


    // Validate first and last names
    if (!nameRegex.test(signUpData.firstName) || !nameRegex.test(signUpData.lastName)) {
      toast({
        title: "Invalid Name",
        description: "First and last names must be 1–20 letters (A–Z only).",
        variant: "destructive",
      });
      return;
    }

    // Split email into local part and domain
    const [localPart, domain] = signUpData.email.split("@");
    // Validate that email contains exactly one "@"
    if (!localPart || !domain) {
      toast({
        title: "Invalid Email Format",
        description: "Email must contain a single @ symbol.",
        variant: "destructive",
      });
      return;
    }

    const localPartRegex = /^[A-Za-z0-9._%+-]{1,25}$/;
    if (!localPartRegex.test(localPart)) {
      toast({
        title: "Invalid Email Username",
        description:
          "The part before @ must be 1–25 characters and contain only English letters, numbers, and . _ % + -",
        variant: "destructive",
      });
      return;
    }
    // Allow gmail.com for testing purposes
    if (!IsraeliAcademicDomains.includes(domain) && domain !== "gmail.com") {
      toast({
        title: "Unrecognized Academic Institution",
        description: "Please use an email from a recognized Israeli university or college.",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please make sure both password fields are identical.",
        variant: "destructive",
      });
      return;
    }


    setIsLoading("signup");
    const { data, error } = await signUp({
      email: signUpData.email,
      password: signUpData.password,
      firstName: signUpData.firstName,
      lastName: signUpData.lastName,
      redirectTo: `${window.location.origin}/home`,
    });
    setIsLoading(null);

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Ride-Share U!",
        description: "Your account has been created successfully.",
      });
      navigate("/home");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading("signin");
    const { error } = await signIn({
      email: signInData.email,
      password: signInData.password,
    });
    setIsLoading(null);

    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/home");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading("reset");
    const { error } = await resetPassword(resetEmail);
    setIsLoading(null);

    if (error) {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check Your Email",
        description: "We've sent you a password reset link. Please check your email.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary flex items-center justify-center">
            <Car className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Ride-Share U
          </CardTitle>
          <CardDescription>
            Community carpooling for university students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@univ.ac.il"
                      value={signInData.email}
                      onChange={(e) =>
                        setSignInData({ ...signInData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData({ ...signInData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={isLoading === "signin"}
                  >
                    {isLoading === "signin" ? "Signing in..." : "Sign In"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@univ.ac.il"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your email to receive a password reset link
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail("");
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-hover"
                      disabled={isLoading === "reset"}
                    >
                      {isLoading === "reset" ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      value={signUpData.firstName}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={signUpData.lastName}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">University Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@univ.ac.il"
                    value={signUpData.email}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, email: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be a valid Israeli academic email address (instituite.ac.il)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={signUpData.confirmPassword}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-hover text-accent-foreground"
                  disabled={isLoading === "signup"}
                >
                  {isLoading === "signup" ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
