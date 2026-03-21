import NotificationBell from "./NotificationBell";

export default function Navbar() {
    return (
        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Linotec Support Portal
            </h1>
            
            <div className="flex items-center gap-4">
                <NotificationBell />
            </div>
        </div>
    );
}
