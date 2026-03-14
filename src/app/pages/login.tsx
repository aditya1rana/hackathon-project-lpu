import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { useNavigate } from "react-router";
import { Package, Mail } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { useAppStore } from "../store";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppStore();

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      id: "admin-123",
      name: "Admin User",
      email: "admin@smartinventory.local",
      role: "Admin",
      department: "IT",
      status: "Active",
      lastActive: new Date().toISOString()
    });
    navigate("/");
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Fetch User Info manually from Google's endpoint using the Access Token
        const userInfo = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
        ).then(res => res.json());
        
        // Mock authorization determination logic
        // In a real app the role comes from the backend DB.
        // For demonstration, any "@gmail.com" logic routes to User Portal
        const isStudent = userInfo.email?.endsWith("@gmail.com"); 
        
        setCurrentUser({
          id: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          role: isStudent ? "Student" : "Admin",
          department: isStudent ? "Engineering" : "IT",
          status: "Active",
          lastActive: new Date().toISOString(),
          avatar: userInfo.picture, // Assuming we add this to the Store Interface
        });

        toast.success(`Welcome back, ${userInfo.name}!`);

        if (isStudent) {
          navigate("/user");
        } else {
          navigate("/");
        }

      } catch (error) {
         toast.error("Failed to extract Google User Profile.");
      }
    },
    onError: () => toast.error("Google Login Failed"),
  });

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Package className="w-10 h-10" />
            <h1 className="text-3xl font-bold">SmartInventory</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Smart Inventory Management for College Labs & Libraries
          </h2>
          <p className="text-xl opacity-90 mb-8">
            AI-powered inventory tracking, automated procurement, and intelligent predictions.
          </p>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1758542113402-b46079642dc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBpbnZlbnRvcnklMjBhdXRvbWF0aW9uJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzM0MTMxNTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Inventory automation"
            className="rounded-2xl shadow-2xl w-full"
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleStandardLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@college.edu"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-12"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm cursor-pointer select-none"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button type="submit" className="w-full h-12 bg-[#4F46E5] hover:bg-[#4338CA]">
              Sign in as Admin (Mock)
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => loginWithGoogle()}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign In with Google
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a href="#" className="text-primary hover:underline font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}