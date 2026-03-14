import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Building2,
  Bell,
  Palette,
  Shield,
  Zap,
  Database,
} from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your college information, preferences, and system configurations.
        </p>
      </div>

      <Tabs defaultValue="college" className="space-y-6">
        <TabsList>
          <TabsTrigger value="college">College Info</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* College Info Tab */}
        <TabsContent value="college" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                College Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>College Name</Label>
                  <Input defaultValue="MIT College of Engineering" />
                </div>
                <div className="space-y-2">
                  <Label>College Code</Label>
                  <Input defaultValue="MITCOE" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" defaultValue="admin@mitcoe.edu" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input defaultValue="+1 (555) 123-4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea defaultValue="123 University Ave, Boston, MA 02115" />
              </div>
              <div className="space-y-2">
                <Label>Time Zone</Label>
                <Select defaultValue="est">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="est">Eastern Time (ET)</SelectItem>
                    <SelectItem value="cst">Central Time (CT)</SelectItem>
                    <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                    <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manage Departments</CardTitle>
                <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Computer Science",
                  "Electronics Engineering",
                  "Chemistry",
                  "Physics",
                  "Robotics",
                  "Library",
                ].map((dept, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-accent/50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{dept}</h4>
                      <p className="text-sm text-muted-foreground">
                        Active • {Math.floor(Math.random() * 50) + 10} users
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-[#EF4444]">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Item Categories</CardTitle>
                <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Electronics", color: "#4F46E5", items: 450 },
                  { name: "Lab Equipment", color: "#06B6D4", items: 380 },
                  { name: "Books", color: "#10B981", items: 820 },
                  { name: "Chemicals", color: "#F59E0B", items: 280 },
                  { name: "Tools", color: "#EF4444", items: 156 },
                  { name: "Furniture", color: "#8B5CF6", items: 92 },
                ].map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <h4 className="font-semibold">{category.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {category.items} items
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#EF4444]">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Low Stock Alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified when items fall below minimum stock level
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">New Request Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for new item requests
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">AI Prediction Alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      Get AI-powered stock depletion predictions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Purchase Order Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      Track status changes in purchase orders
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email summaries daily
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                API Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-5 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold mb-1">QR Code Scanner</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable QR code scanning for quick item lookup
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label>Scanner API Key</Label>
                    <Input
                      type="password"
                      defaultValue="sk_live_xxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="p-5 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold mb-1">Barcode Scanner</h4>
                      <p className="text-sm text-muted-foreground">
                        Integrate barcode scanning for inventory management
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="space-y-2">
                    <Label>Scanner API Key</Label>
                    <Input type="password" placeholder="Enter API key" />
                  </div>
                </div>

                <div className="p-5 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold mb-1">Cloud Backup</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatic daily backups to cloud storage
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Backup Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Storage Provider</Label>
                      <Select defaultValue="aws">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aws">AWS S3</SelectItem>
                          <SelectItem value="gcp">Google Cloud</SelectItem>
                          <SelectItem value="azure">Azure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Save Integration Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Database Size
                  </p>
                  <p className="text-2xl font-bold">2.4 GB</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Last Backup
                  </p>
                  <p className="text-2xl font-bold">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Backup Now</Button>
                <Button variant="outline">Restore from Backup</Button>
                <Button variant="outline" className="text-[#EF4444]">
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
