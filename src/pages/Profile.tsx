import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Star, LogOut, CheckCircle, XCircle } from "lucide-react";
import { useProfileViewModel } from "@/viewmodels/useProfileViewModel";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";
import { getGenderIcon } from "@/components/GenderAvatar";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, signOut } = useAuthViewModel();
  const { profile: fetchedProfile, isLoading, fetchProfile, updateProfile } = useProfileViewModel();

  const profile = useMemo(() => fetchedProfile || (session?.user ? {
    id: session.user.id,
    first_name: session.user.user_metadata?.first_name || "",
    last_name: session.user.user_metadata?.last_name || "",
    email: session.user.email || "",
    phone: "",
    avatar_url: "",
    is_verified: false,
    rating_score: 0,
    rating_count: 0,
    bit_link: "",
    gender: "",
  } : null), [fetchedProfile, session?.user]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bitLink: "",
    gender: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (session === null) {
      navigate("/auth");
    }
  }, [session, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        bitLink: profile.bit_link || "",
        gender: profile.gender || "",
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const { error } = await updateProfile({
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      bit_link: formData.bitLink,
      gender: formData.gender,
    });

    if (error) {
      toast({
        title: "שגיאה",
        description: (error as any).message || "עדכון הפרופיל נכשל",
        variant: "destructive",
      });
    } else {
      toast({
        title: "הפרופיל עודכן",
        description: "הפרופיל שלך עודכן בהצלחה.",
      });
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!session) return null;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;
  const getAvatarUrl = () => {
    if (profile.avatar_url) return profile.avatar_url;
    return getGenderIcon(profile.gender);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-primary-foreground">
            <AvatarImage src={getAvatarUrl()} />
            <AvatarFallback className="bg-accent text-accent-foreground text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span>
                {profile.rating_score > 0
                  ? profile.rating_score.toFixed(1)
                  : "משתמש חדש"}
              </span>
              {profile.rating_count > 0 && (
                <span className="text-sm">({profile.rating_count} דירוגים)</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Verification Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {profile.is_verified ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">אימות סטודנט</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <Badge
                className={
                  profile.is_verified
                    ? "bg-success-light text-success border-success"
                    : "bg-muted text-muted-foreground"
                }
              >
                {profile.is_verified ? "מאומת" : "לא מאומת"}
              </Badge>
            </div>
            
            {/* Email Confirmation Status */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                {session?.user?.email_confirmed_at ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">אישור אימייל</p>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.email_confirmed_at 
                      ? "האימייל אושר" 
                      : "האימייל עדיין לא אושר"}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  session?.user?.email_confirmed_at
                    ? "bg-success-light text-success border-success"
                    : "bg-amber-100 text-amber-700 border-amber-300"
                }
              >
                {session?.user?.email_confirmed_at ? "אושר" : "ממתין"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>עריכת פרופיל</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">שם פרטי</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">שם משפחה</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">מספר טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+972 XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">מגדר</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                  required
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="בחר מגדר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bitLink">קישור תשלום Bit</Label>
                <Input
                  id="bitLink"
                  type="url"
                  placeholder="https://bit.ly/..."
                  value={formData.bitLink}
                  onChange={(e) =>
                    setFormData({ ...formData, bitLink: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  הנוסעים ישתמשו בקישור הזה כדי לשלם לך
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={isLoading}
              >
                {isLoading ? "שומר..." : "שמור שינויים"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="ml-2 h-4 w-4" />
          התנתקות
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
