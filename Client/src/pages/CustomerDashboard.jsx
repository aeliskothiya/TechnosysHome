// src/pages/customer/CustomerDashboard.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { MapPin, ChevronDown, User, LogOut, Settings, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets"; // your navbar logo import

// banners (10 images) - adjust paths if your structure is different
import banner1 from "../assets/banners/banner1.jpg";
import banner2 from "../assets/banners/banner2.jpg";
import banner3 from "../assets/banners/banner3.jpg";
import banner4 from "../assets/banners/banner4.jpg";
import banner5 from "../assets/banners/banner5.jpg";
import banner6 from "../assets/banners/banner6.jpg";
import banner7 from "../assets/banners/banner7.jpg";
import banner8 from "../assets/banners/banner8.jpg";
import banner9 from "../assets/banners/banner9.jpg";
import banner10 from "../assets/banners/banner10.jpg";

const topBanners = [banner1, banner2, banner3, banner4, banner5];
const bottomBanners = [banner6, banner7, banner8, banner9, banner10];

const backendUrl = "http://localhost:4000"; // update if different

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userData, setIsLoggedIn, setUserData } = useContext(AppContext);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Search + suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Profile menu
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef();

  // fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/service-categories/active`);
        // support both variants: { categories: [] } or { data: [] }
        setCategories(data.categories || data.data || []);
      } catch (err) {
        console.error("Fetch categories error:", err);
      }
    };
    fetchCategories();
  }, []);

  // fetch subcategories for selected category
  const fetchSubCategories = async (categoryId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/sub-service-categories?serviceCategoryId=${categoryId}`
      );
      setSubCategories(data.subCategories || data.data || []);
    } catch (err) {
      console.error("Fetch subcategories:", err);
    }
  };

  // combined search suggestions (categories + subcategories)
  const handleSearchChange = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setShowSuggestions(true);

    if (!q.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      // local category matches
      const catMatches = categories.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase())
      );

      // fetch all subcategories (server returns active ones)
      const res = await axios.get(`${backendUrl}/api/sub-service-categories`);
      const subs = res.data.subCategories || res.data.data || [];
      const subMatches = subs.filter((s) =>
        s.name.toLowerCase().includes(q.toLowerCase())
      );

      const combined = [
        ...catMatches.map((c) => ({ type: "category", name: c.name, id: c._id })),
        ...subMatches.map((s) => ({
          type: "service",
          name: s.name,
          id: s._id,
          price: s.price,
        })),
      ];

      setSuggestions(combined.slice(0, 8));
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  // click outside to close profile menu / suggestions
  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // logout helper
  const handleLogout = async () => {
    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      // ignore server error, still proceed to local logout
      console.warn("Logout request error:", err);
    }
    setIsLoggedIn(false);
    setUserData(null);
    navigate("/login-customer");
  };

  // helper: open category view
  const openCategory = async (cat) => {
    setSelectedCategory(cat);
    await fetchSubCategories(cat._id);
    window.scrollTo({ top: 380, behavior: "smooth" }); // bring into view
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* =========================
            Premium Navbar (white)
         ========================= */}


      {/* spacer to avoid navbar overlap */}
      <div className="h-20" />

      {/* =========================
            HERO (top banners)
         ========================= */}
      {/* center - search (compact on small screens) */}
      <div className="flex-1 px-4">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            aria-label="Search services"
            placeholder="Search for 'Plumber', 'Salon', 'Cleaning'..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(true)}
            className="w-full mb-5 bg-gray-100 rounded-full py-3 px-4 shadow-inner text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
          />
          {/* suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 z-50 max-h-64 overflow-auto">
              {suggestions.map((it, idx) => (
                <div
                  key={idx}
                  onMouseDown={() => {
                    // onMouseDown to prevent blur before click
                    setShowSuggestions(false);
                    setSearchQuery(it.name);
                    if (it.type === "category") {
                      const cat = categories.find((c) => c._id === it.id);
                      openCategory(cat);
                    } else {
                      navigate(`/customer/service/${it.id}`);
                    }
                  }}
                  className="px-4 py-3 hover:bg-sky-50 flex justify-between items-center cursor-pointer"
                >
                  <div className="text-gray-800">{it.name}</div>
                  <div className="text-xs text-gray-400">
                    {it.type === "category" ? "Category" : "Service"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <section className="relative">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            navigation
            loop
            className="rounded-2xl overflow-hidden"
            style={{ height: 460 }}
          >
            {topBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="w-full h-full bg-center bg-cover flex items-center justify-center relative"
                  style={{ backgroundImage: `url(${src})` }}
                >
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="relative z-10 text-center px-6 py-8">
                    <h1 className="text-4xl md:text-5xl lg:text-5xl font-semibold text-white drop-shadow">
                      Home Services You Can Trust
                    </h1>
                    <p className="text-white/90 mt-3 mb-6 max-w-2xl mx-auto">
                      Reliable. Affordable. Professional. Book verified technicians for your home.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => (isLoggedIn ? navigate("/customer/bookings") : navigate("/login-customer"))}
                        className="bg-white text-sky-700 py-3 px-6 rounded-full font-medium shadow hover:scale-[1.02] transition transform"
                      >
                        {isLoggedIn ? "Book a Service" : "Get Started"}
                      </button>
                      <button
                        onClick={() => window.scrollTo({ top: 720, behavior: "smooth" })}
                        className="border border-white/30 text-white py-3 px-4 rounded-full hover:bg-white/10 transition"
                      >
                        Browse Categories
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* small location row */}
        <div className="flex items-center justify-center text-gray-600 mt-6">
          <MapPin className="text-sky-600" /> <span className="ml-2">Surat, Gujarat</span>
        </div>

        {/* =========================
            Categories (grid)
         ========================= */}
        <section className="mt-10 bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-800 text-center mb-6">Popular Categories</h2>

          {!selectedCategory ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => openCategory(cat)}
                  className="bg-white shadow-sm hover:shadow-md rounded-xl py-6 px-4 flex flex-col items-center gap-3 transition transform hover:-translate-y-1"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-50 flex items-center justify-center border">
                    {/* category image or fallback */}
                    <img
                      src={cat.image ? `${backendUrl}${cat.image}` : "/placeholder-circle.png"}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-gray-800 font-medium">{cat.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSubCategories([]);
                  }}
                  className="text-sm text-sky-600 hover:underline flex items-center gap-2"
                >
                  <span className="inline-block rotate-180">➜</span> Back to categories
                </button>
                <div className="text-lg font-semibold">{selectedCategory.name} services</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {subCategories.length > 0 ? (
                  subCategories.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => (isLoggedIn ? navigate(`/customer/service/${s._id}`) : navigate("/login-customer"))}
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition transform hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                          <img src={s.image ? `${backendUrl}${s.image}` : "/placeholder-rect.png"} alt={s.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{s.name}</div>
                          <div className="text-sm text-gray-500">₹{s.price}</div>
                        </div>
                        <div className="text-sky-600 font-semibold">Book →</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-8">No services available.</div>
                )}
              </div>
            </>
          )}
        </section>

        {/* =========================
            How It Works + Testimonials
         ========================= */}
        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">How Technosys Works</h3>
            <ol className="space-y-4 text-gray-600">
              <li>1. Book a service → choose the service and slot</li>
              <li>2. Get verified professionals at home</li>
              <li>3. Pay after service and rate the technician</li>
            </ol>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">What customers say</h3>
            <div className="space-y-4 text-gray-700">
              <blockquote className="italic">"Quick and professional plumber visit — five stars!"</blockquote>
              <div className="text-sm text-gray-500">— A happy customer</div>
            </div>
          </div>
        </section>

        {/* =========================
           Bottom banners slider (discover more)
         ========================= */}
        <section className="mt-10">
          <h3 className="text-2xl font-semibold text-slate-800 mb-4 text-center">Discover More Services</h3>
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 2800, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="rounded-2xl"
            spaceBetween={16}
          >
            {bottomBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="h-56 bg-cover bg-center rounded-xl overflow-hidden relative"
                  style={{ backgroundImage: `url(${src})` }}
                >
                  <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                    <div className="text-white font-semibold">Professional Home Services</div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* footer */}
        <footer className="mt-12 bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-700">© {new Date().getFullYear()} Technosys — Built with ❤️</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default CustomerDashboard;
