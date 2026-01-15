import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, signOut } = useAuthViewModel();
  const { profile, isLoading, fetchProfile, updateProfile } = useProfileViewModel();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bitLink: "",
  });

  useEffect(() => {
    if (session === null) {
      navigate("/auth");
    } else if (session && !profile) {
      fetchProfile();
    }
  }, [session, navigate, profile, fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        bitLink: profile.bit_link || "",
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
    });

    if (error) {
      toast({
        title: "Error",
        description: (error as any).message || "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!session) return null;
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-primary-foreground">
            <AvatarImage src={profile.avatar_url} />
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
                  : "New User"}
              </span>
              {profile.rating_count > 0 && (
                <span className="text-sm">({profile.rating_count} ratings)</span>
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
                  <p className="font-semibold">Student Verification</p>
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
                {profile.is_verified ? "Verified" : "Not Verified"}
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
                  <p className="font-semibold">Email Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.email_confirmed_at 
                      ? "Email confirmed" 
                      : "Email not confirmed yet"}
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
                {session?.user?.email_confirmed_at ? "Confirmed" : "Pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
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
                  <Label htmlFor="lastName">Last Name</Label>
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
                <Label htmlFor="phone">Phone Number</Label>
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
                <Label htmlFor="bitLink">Bit Payment Link</Label>
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
                  Passengers will use this link to pay you
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
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
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
