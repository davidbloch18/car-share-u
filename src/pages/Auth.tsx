import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Car } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { IsraeliAcademicDomains } from "@/lib/israeliAcademicDomains";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, resetPassword } = useAuthViewModel();
  const [isLoading, setIsLoading] = useState<"signin" | "signup" | "reset" | "updatePassword" | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    // Check if user is coming from password reset email
    const resetToken = searchParams.get('reset');
    if (resetToken === 'true') {
      setShowResetPassword(true);
    }
    
    // Check if user is coming from email confirmation
    const confirmationType = searchParams.get('type');
    if (confirmationType === 'signup' || confirmationType === 'email') {
      toast({
        title: "האימייל אומת!",
        description: "האימייל שלך אומת בהצלחה. כעת ניתן להתחבר לחשבון.",
        duration: 5000,
      });
    }
  }, [searchParams, toast]);

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("rememberMe") === "true";
  });

  const [signInData, setSignInData] = useState(() => {
    const savedEmail = localStorage.getItem("rememberedEmail") || "";
    return {
      email: savedEmail,
      password: "",
    };
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameRegex = /^[A-Za-z]{1,20}$/;


    // Validate first and last names
    if (!nameRegex.test(signUpData.firstName) || !nameRegex.test(signUpData.lastName)) {
      toast({
        title: "שם לא תקין",
        description: "שם פרטי ושם משפחה חייבים להכיל 1-20 אותיות באנגלית בלבד (A-Z).",
        variant: "destructive",
      });
      return;
    }

    // Split email into local part and domain
    const [localPart, domain] = signUpData.email.split("@");
    // Validate that email contains exactly one "@"
    if (!localPart || !domain) {
      toast({
        title: "פורמט אימייל לא תקין",
        description: "האימייל חייב להכיל סימן @ אחד.",
        variant: "destructive",
      });
      return;
    }

    const localPartRegex = /^[A-Za-z0-9._%+-]{1,25}$/;
    if (!localPartRegex.test(localPart)) {
      toast({
        title: "שם משתמש אימייל לא תקין",
        description:
          "החלק לפני @ חייב להכיל 1-25 תווים ולכלול רק אותיות באנגלית, מספרים ותווים . _ % + -",
        variant: "destructive",
      });
      return;
    }
    // Allow gmail.com for testing purposes
    if (!IsraeliAcademicDomains.includes(domain) && domain !== "gmail.com") {
      toast({
        title: "מוסד אקדמי לא מזוהה",
        description: "יש להשתמש באימייל ממוסד אקדמי ישראלי מוכר.",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "הסיסמאות לא תואמות",
        description: "יש לוודא ששני שדות הסיסמה זהים.",
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
      redirectTo: `${window.location.origin}/auth/callback?type=signup`,
    });
    setIsLoading(null);

    if (error) {
      toast({
        title: "ההרשמה נכשלה",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "!ברוכים הבאים ל-Ride-Share U",
        description: "נא לבדוק את האימייל כדי לאשר את החשבון. ניתן להתחבר לאחר האישור.",
        duration: 7000,
      });
      // Don't navigate to home - user needs to confirm email first
      // Show the sign in tab instead
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
        title: "ההתחברות נכשלה",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Save or clear remembered email based on "Remember Me" checkbox
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", signInData.email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }
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
        title: "האיפוס נכשל",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "בדוק את האימייל",
        description: "שלחנו לך קישור לאיפוס סיסמה. נא לבדוק את תיבת הדואר.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "הסיסמאות לא תואמות",
        description: "יש לוודא ששני שדות הסיסמה זהים.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "סיסמה קצרה מדי",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading("updatePassword");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(null);

    if (error) {
      toast({
        title: "העדכון נכשל",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "הסיסמה עודכנה",
        description: "הסיסמה עודכנה בהצלחה. כעת ניתן להתחבר.",
      });
      setShowResetPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
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
            {showResetPassword ? "איפוס סיסמה" : "שיתוף נסיעות לסטודנטים"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showResetPassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">סיסמה חדשה</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">אימות סיסמה חדשה</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={isLoading === "updatePassword"}
              >
                {isLoading === "updatePassword" ? "מעדכן..." : "עדכן סיסמה"}
              </Button>
            </form>
          ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">אימייל</Label>
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
                    <Label htmlFor="signin-password">סיסמה</Label>
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                      זכור אותי
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={isLoading === "signin"}
                  >
                    {isLoading === "signin" ? "מתחבר..." : "התחבר"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    שכחת סיסמה?
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">אימייל</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@univ.ac.il"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      הזן את האימייל שלך כדי לקבל קישור לאיפוס סיסמה
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
                      חזרה
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-hover"
                      disabled={isLoading === "reset"}
                    >
                      {isLoading === "reset" ? "שולח..." : "שלח קישור איפוס"}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">שם פרטי</Label>
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
                    <Label htmlFor="last-name">שם משפחה</Label>
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
                  <Label htmlFor="signup-email">אימייל אקדמי</Label>
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
                    חייב להיות אימייל ממוסד אקדמי ישראלי (institute.ac.il)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">סיסמה</Label>
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
                  <Label htmlFor="signup-confirm-password">אימות סיסמה</Label>
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
                  {isLoading === "signup" ? "יוצר חשבון..." : "הרשמה"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
