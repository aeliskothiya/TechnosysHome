import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  FileText, 
  Check, 
  Package,
  CreditCard,
  History,
  Download,
  Loader2
} from "lucide-react";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

export default function TechnicianSubscription() {
  const {
    backendUrl,
    userData,
    fetchUserData,
    getUserData,
    realtimeSubscribe,
  } = useContext(AppContext);

  // packages + history
  const [packages, setPackages] = useState([]);
  const [history, setHistory] = useState([]);

  // ⭐ store successful/failed payments here (frontend only)
  const [payments, setPayments] = useState([]);

  // loading + UI states
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState(null);

  // pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  // ----------------- FETCH PACKAGES -----------------
  async function fetchPackages() {
    try {
      setLoadingPackages(true);
      const res = await axios.get(`${backendUrl}/api/subscription-packages`, {
        withCredentials: true,
      });
      setPackages(res.data?.data || []);
    } catch (err) {
      setError("Unable to load plans.");
    } finally {
      setLoadingPackages(false);
    }
  }

  // ----------------- FETCH HISTORY -----------------
  async function fetchHistory() {
    try {
      setLoadingHistory(true);
      const res = await axios.get(
        `${backendUrl}/api/subscription-packages/history`,
        { withCredentials: true }
      );
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // ----------------- ON LOAD -----------------
  useEffect(() => {
    fetchPackages();
    fetchHistory();
  }, []);

  // Subscribe to realtime updates for SubscriptionHistory so purchase history updates live
  useEffect(() => {
    if (!userData || !realtimeSubscribe) return;

    const unsubscribe = realtimeSubscribe("SubscriptionHistory", (payload) => {
      try {
        const doc = payload?.doc;
        if (!doc) return;

        const docTechId = String(
          doc?.TechnicianID || doc?.TechnicianId || doc?.technicianID || ""
        );
        const currentId = String(userData?.id || userData?._id || "");
        if (!currentId) return;

        if (docTechId !== currentId) return;

        // For simplicity, refetch the history when relevant changes occur
        fetchHistory();
      } catch (e) {
        console.error("Realtime SubscriptionHistory handler error", e);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [realtimeSubscribe, userData]);

  // ----------------- LOAD RAZORPAY -----------------
  const loadRazorpayScript = (
    src = "https://checkout.razorpay.com/v1/checkout.js"
  ) =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") return resolve(false);
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve(true);
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Razorpay SDK failed to load"));
      document.body.appendChild(s);
    });

  // ----------------- BUY PACKAGE -----------------
  const handleBuy = async (pkg) => {
    if (!userData) {
      toast.info("Please log in as a technician.");
      return;
    }

    try {
      setBuyingId(pkg._id);

      // create order
      const createRes = await axios.post(
        `${backendUrl}/api/subscription-packages/${pkg._id}/create-order`,
        {},
        { withCredentials: true }
      );

      if (!createRes.data?.success) {
        toast.error(createRes.data?.message || "Failed to create order");
        setBuyingId(null);
        return;
      }

      const { order, paymentId } = createRes.data.data;
      const key = createRes.data.key;

      await loadRazorpayScript();

      // Razorpay checkout
      const options = {
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Technosys",
        description: pkg.name,
        order_id: order.id,
        modal: {
          ondismiss: function () {
            try {
              setBuyingId(null);
            } catch (e) {
              // ignore
            }
          },
        },

        handler: async function (response) {
          try {
            const verifyRes = await axios.post(
              `${backendUrl}/api/subscription-packages/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentId,
              },
              { withCredentials: true }
            );

            if (verifyRes.data?.success) {
              // ⭐ store payment status locally
              const payment = verifyRes.data?.data?.payment;
              if (payment) {
                setPayments((prev) => [...prev, payment]);
              }
              toast.success("Payment successful!");
              await fetchHistory();

              // update navbar coins
              await getUserData();
            } else {
              toast.error("Payment verification failed");
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || "Payment error");
          } finally {
            setBuyingId(null);
          }
        },

        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
          contact: userData?.mobileNumber || "",
        },

        theme: { color: "#155DFC" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Payment failed.");
      setBuyingId(null);
    }
  };

  // ---------------------------------------------
  // ⭐ MATCH PAYMENT STATUS WITH HISTORY FRONTEND ONLY
  // ---------------------------------------------
  function getStatusForHistory(h) {
    const match = payments.find(
      (p) =>
        p.PackageID === h.PackageID?._id &&
        p.TechnicianID === h.TechnicianID &&
        Math.abs(new Date(p.createdAt) - new Date(h.PurchasedAt)) < 20000
    );

    return match?.Status || "Success"; // default Success (since backend already succeeded)
  }

  // pagination
  const totalPages = Math.max(1, Math.ceil(history.length / PER_PAGE));
  const pagedHistory = history.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Coin badge
  const CoinBadge = ({ coins }) => (
    <div className="flex items-center space-x-2">
      <div className="flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full">
        <span className="text-xs font-bold text-yellow-900">C</span>
      </div>
      <div className="text-gray-700 font-medium text-sm">{Number(coins).toLocaleString()}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
            Subscription Plans
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All packages include amazing features and dedicated support.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {packages.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Available Plans</div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {history.filter(h => getStatusForHistory(h) === "Success").length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Successful Purchases</div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {history.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Transactions</div>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <History className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Packages Section - Keeping your original card design */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <Package className="h-7 w-7 text-blue-600" />
                <span>Available Subscription Plans</span>
              </h2>
              <p className="text-gray-600 mt-2">Choose the plan that works best for you</p>
            </div>
          </div>

          {loadingPackages ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-16 text-center">
              <ServiceOrbitLoader show={true} size={80} speed={700} />
              <p className="text-gray-600 mt-4">Loading subscription plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg, index) => {
                const colors = [
                  "from-pink-400 to-pink-500",
                  "from-blue-400 to-blue-500",
                  "from-purple-400 to-purple-500",
                ];

                return (
                  <article
                    key={pkg._id}
                    className="rounded-2xl shadow-lg bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {/* Top Color Section */}
                    <div
                      className={`relative h-38 w-full bg-gradient-to-br ${colors[index % 3]
                        } flex items-center justify-center overflow-hidden`}
                    >
                      <div className="absolute bottom-0 left-0 right-0">
                        <svg
                          viewBox="0 0 1440 120"
                          className="w-full h-16"
                          preserveAspectRatio="none"
                        >
                          <path
                            fill="#ffffff"
                            d="M0,40 C150,80 300,0 450,20 C600,40 750,90 900,70 C1050,50 1200,0 1440,40 L1440,120 L0,120 Z"
                          >
                            <animate
                              attributeName="d"
                              dur="6s"
                              repeatCount="indefinite"
                              values="
            M0,40 C150,80 300,0 450,20 C600,40 750,90 900,70 C1050,50 1200,0 1440,40 L1440,120 L0,120 Z;
            M0,60 C150,40 300,80 450,40 C600,10 750,50 900,30 C1050,60 1200,20 1440,60 L1440,120 L0,120 Z;
            M0,40 C150,80 300,0 450,20 C600,40 750,90 900,70 C1050,50 1200,0 1440,40 L1440,120 L0,120 Z
          "
                            />
                          </path>
                        </svg>
                      </div>

                      {/* Package Name */}
                      <h3 className="text-white text-2xl font-bold relative z-10">
                        {pkg.name}
                      </h3>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mt-4">
                      <p className="text-4xl font-extrabold text-gray-900">
                        ₹{pkg.price}
                      </p>
                    </div>

                    {/* Description (split by . ) */}
                    <div className="px-6 mt-4 space-y-2 text-gray-700 text-sm">
                      {pkg.description?.split(".").map((line, i) =>
                        line.trim() ? (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-purple-600" />
                            <span>{line.trim()}</span>
                          </div>
                        ) : null
                      )}
                    </div>

                    {/* Coins Row */}
                    <div className="mt-4 px-6 flex items-center gap-3">
                      <CoinBadge coins={pkg.coins} />
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => handleBuy(pkg)}
                      disabled={buyingId === pkg._id}
                      className={`mt-5 w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 hover:scale-105 ${
                        buyingId === pkg._id
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      }`}
                    >
                      {buyingId === pkg._id ? (
                        <span className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing…</span>
                        </span>
                      ) : (
                        "Buy now"
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Purchase History Section - Updated with list design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <History className="h-6 w-6 text-purple-600" />
              <span>Purchase History</span>
            </h2>
            <p className="text-gray-600 mt-2">Your subscription purchase records</p>
          </div>

          {loadingHistory ? (
            <div className="text-center py-16">
              <ServiceOrbitLoader show={true} size={80} speed={700} />
              <p className="text-gray-600 mt-4">Loading purchase history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No purchases yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your subscription purchases will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200/50">
                {pagedHistory.map((h) => (
                  <div
                    key={h._id}
                    className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200 group"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="h-6 w-6 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-semibold text-gray-900 truncate">
                              {h.PackageID?.name}
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                              <Check className="h-3 w-3 mr-1" />
                              Success
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 flex-wrap">
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center gap-2">
                                <CoinBadge coins={h.PackageID?.coins} />
                                <span className="text-sm text-gray-600">coins</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 font-medium">
                              <span>₹{h.PackageID?.price}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center space-x-4">
                        <div className="text-right text-sm text-gray-600">
                          <div>{new Date(h.PurchasedAt || h.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(h.PurchasedAt || h.createdAt).toLocaleTimeString()}</div>
                        </div>

                        {h.invoice_pdf && (
                          <button
                            onClick={() => window.open(`${backendUrl}${h.invoice_pdf}`, "_blank")}
                            className="p-2 rounded-xl text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
                            title="Download invoice"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {history.length > PER_PAGE && (
                <div className="px-6 py-4 border-t border-gray-200/50">
                  <div className="flex items-center justify-center gap-2 select-none">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        page === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-gray-100 shadow-sm"
                      }`}
                    >
                      Previous
                    </button>

                    {(() => {
                      const pages = [];
                      const total = totalPages;

                      pages.push(1);
                      if (page > 3) pages.push("...");
                      for (let p = page - 1; p <= page + 1; p++) {
                        if (p > 1 && p < total) pages.push(p);
                      }
                      if (page < total - 2) pages.push("...");
                      if (total > 1) pages.push(total);

                      return pages.map((p, i) =>
                        p === "..." ? (
                          <span key={i} className="px-3 py-2 text-gray-500">
                            …
                          </span>
                        ) : (
                          <button
                            key={i}
                            onClick={() => setPage(p)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm border transition-all ${
                              p === page
                                ? "bg-gray-900 text-white shadow-md scale-110 border-gray-900"
                                : "hover:bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      );
                    })()}

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        page === totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-gray-100 shadow-sm"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}