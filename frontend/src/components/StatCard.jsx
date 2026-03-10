export default function StatCard({ label, value, color }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1 transition-all hover:shadow-md hover:border-blue-100">
            <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
                <div className={`w-2 h-2 rounded-full ${color} shadow-sm`}></div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{value}</span>
            </div>
        </div>
    );
}
