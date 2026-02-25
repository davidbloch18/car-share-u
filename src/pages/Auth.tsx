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
  const { session, signUp, signIn, signInWithGoogle, resetPassword } = useAuthViewModel();
  const [isLoading, setIsLoading] = useState<"signin" | "signup" | "reset" | "updatePassword" | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Redirect to home if already logged in (handles Google OAuth callback)
  useEffect(() => {
    if (session?.user) {
      // For OAuth users, ensure profile exists with correct name
      const user = session.user;
      const meta = user.user_metadata || {};
      const provider = user.app_metadata?.provider;

      if (provider === 'google') {
        const firstName = meta.given_name || meta.full_name?.split(' ')[0] || meta.name?.split(' ')[0] || '';
        const lastName = meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || meta.name?.split(' ').slice(1).join(' ') || '';
        const avatarUrl = meta.avatar_url || meta.picture || null;

        // Upsert profile for Google user (in case trigger didn't set names correctly)
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
          }, { onConflict: 'id', ignoreDuplicates: false })
          .then(() => {
            navigate('/home', { replace: true });
          });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [session, navigate]);

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

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">או</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={signInWithGoogle}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    התחבר עם Google
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

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">או</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={signInWithGoogle}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  הרשמה עם Google
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
