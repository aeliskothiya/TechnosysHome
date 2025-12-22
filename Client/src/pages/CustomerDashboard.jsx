// src/pages/customer/CustomerDashboard.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import {
  MapPin,
  ChevronDown,
  User,
  LogOut,
  Settings,
  List,
  Search,
  ArrowRight,
  Star,
  Clock,
  Shield,
  ArrowLeft,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { AppContext } from "../context/AppContext";

// banners
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

const backendUrl = "http://localhost:4000";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userData, setIsLoggedIn, setUserData } =
    useContext(AppContext);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Search + suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef();
  const categoryRef = useRef();
  const servicesRef = useRef();

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/service-categories/active`
        );
        setCategories(data.categories || data.data || []);
      } catch (err) {
        console.error("Fetch categories error:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch subcategories
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

  // Search Suggestions
  const handleSearchChange = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setShowSuggestions(true);

    if (!q.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const catMatches = categories.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase())
      );

      const res = await axios.get(`${backendUrl}/api/sub-service-categories`);
      const subs = res.data.subCategories || res.data.data || [];

      const subMatches = subs.filter((s) =>
        s.name.toLowerCase().includes(q.toLowerCase())
      );

      const combined = [
        ...catMatches.map((c) => ({
          type: "category",
          name: c.name,
          id: c._id,
        })),
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

  // Close profile menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {}
    setIsLoggedIn(false);
    setUserData(null);
    navigate("/login-customer");
  };

  // Category open with responsive scroll
  const openCategory = async (cat) => {
    setSelectedCategory(cat);
    await fetchSubCategories(cat._id);

    setTimeout(() => {
      categoryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white font-inter">
      {/* navbar spacer */}
      <div className="" />

      {/* Hero Search Section */}
      <div className="relative bg-gradient-to-r from-sky-500 to-blue-600 py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Find Trusted Home Services
          </h1>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Professional technicians for all your home needs. Book instantly, pay after service.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                aria-label="Search services"
                placeholder="Search for 'Plumber', 'Salon', 'Cleaning', 'Electrician'..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                className="
                  w-full bg-white rounded-full py-4 pl-12 pr-4 
                  shadow-xl text-gray-700 placeholder-gray-500
                  focus:ring-3 focus:ring-sky-300 focus:ring-offset-2 outline-none transition
                  text-lg
                "
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="
                  absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl
                  border border-gray-200 z-50 max-h-72 overflow-y-auto
                  animate-fadeIn
                "
              >
                {suggestions.map((it, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => {
                      setShowSuggestions(false);
                      setSearchQuery(it.name);
                      if (it.type === "category") {
                        const cat = categories.find((c) => c._id === it.id);
                        openCategory(cat);
                      } else {
                        navigate(`/customer/service/${it.id}`);
                      }
                    }}
                    className="
                      px-6 py-4 hover:bg-sky-50 cursor-pointer
                      flex justify-between items-center border-b border-gray-100 last:border-0
                      transition-all duration-200
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${it.type === 'category' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {it.type === 'category' ? '🏠' : '🔧'}
                      </div>
                      <div>
                        <div className="text-gray-800 font-medium">{it.name}</div>
                        <div className="text-sm text-gray-500">
                          {it.type === "category" ? "Service Category" : "Professional Service"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {it.price && (
                        <span className="font-semibold text-gray-700">₹{it.price}</span>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-white">
            <div className="text-center">
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm opacity-80">Verified Experts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">4.8★</div>
              <div className="text-sm opacity-80">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm opacity-80">Service Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 relative z-10">
        {/* HERO SLIDER */}
        <section className="mb-12">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            pagination={{ 
              clickable: true,
              bulletClass: 'swiper-pagination-bullet !bg-white/50',
              bulletActiveClass: 'swiper-pagination-bullet-active !bg-white'
            }}
            navigation={{
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            }}
            loop
            className="rounded-3xl overflow-hidden shadow-2xl"
          >
            {topBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="
                    w-full h-72 sm:h-80 md:h-[500px]
                    bg-center bg-cover flex items-center relative
                  "
                  style={{ backgroundImage: `url(${src})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
                  <div className="relative z-10 px-8 md:px-16 py-12 text-left max-w-2xl">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                      Professional Home Services
                    </h1>
                    <p className="text-white/90 text-lg mb-8 max-w-xl">
                      Reliable, affordable, and professional technicians at your doorstep.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() =>
                          isLoggedIn
                            ? servicesRef.current?.scrollIntoView({ behavior: 'smooth' })
                            : navigate("/login-customer")
                        }
                        className="
                          bg-white text-sky-700 py-3 px-8 rounded-full font-semibold shadow-xl
                          hover:scale-[1.02] hover:shadow-2xl transition-all duration-300
                          flex items-center gap-2
                        "
                      >
                        {isLoggedIn ? "Book Now" : "Get Started"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => categoryRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="
                          border-2 border-white text-white py-3 px-6 rounded-full font-medium
                          hover:bg-white/10 transition-all duration-300
                        "
                      >
                        Browse Services
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Location & Features */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center bg-white rounded-2xl px-6 py-4 shadow-lg">
            <MapPin className="text-sky-600 w-6 h-6" />
            <span className="ml-3 text-gray-700 font-medium">Surat, Gujarat</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Verified Pros</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium">Same Day Service</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Quality Guaranteed</span>
            </div>
          </div>
        </div>

        {/* =========================
             CATEGORIES SECTION
        ========================= */}
        <section
          className="mb-16 bg-white rounded-3xl p-8 shadow-xl"
          ref={categoryRef}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {selectedCategory ? `${selectedCategory.name} Services` : "Popular Categories"}
              </h2>
              <p className="text-gray-600 mt-2">
                {selectedCategory 
                  ? "Choose from our professional services" 
                  : "Browse our wide range of home service categories"}
              </p>
            </div>
            
            {selectedCategory && (
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSubCategories([]);
                }}
                className="
                  text-sky-600 hover:text-sky-700 font-medium
                  flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors
                "
              >
                <ArrowLeft className="w-4 h-4" />
                Back to categories
              </button>
            )}
          </div>

          {!selectedCategory ? (
            // Categories Grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => openCategory(cat)}
                  className="
                    group relative bg-white rounded-2xl p-5
                    border border-gray-200 hover:border-sky-300
                    shadow-sm hover:shadow-xl transition-all duration-300
                    flex flex-col items-center gap-4
                    hover:-translate-y-1
                  "
                >
                  <div className="relative">
                    <div className="
                      w-20 h-20 rounded-2xl overflow-hidden
                      bg-gradient-to-br from-sky-50 to-blue-100
                      flex items-center justify-center
                      group-hover:scale-110 transition-transform duration-300
                    ">
                      <img
                        src={
                          cat.image
                            ? `${backendUrl}${cat.image}`
                            : "/placeholder-circle.png"
                        }
                        alt={cat.name}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    </div>
                    <div className="
                      absolute -bottom-2 -right-2 w-8 h-8 rounded-full
                      bg-sky-500 flex items-center justify-center
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-gray-800 font-semibold text-sm sm:text-base">
                      {cat.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Subcategories Grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subCategories.length > 0 ? (
                subCategories.map((s) => (
                  <div
                    key={s._id}
                    onClick={() =>
                      isLoggedIn
                        ? navigate(`/customer/service/${s._id}`)
                        : navigate("/login-customer")
                    }
                    className="
                      group bg-white rounded-2xl p-5 cursor-pointer
                      border border-gray-200 hover:border-sky-300
                      shadow-sm hover:shadow-xl transition-all duration-300
                      hover:-translate-y-1
                    "
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={
                            s.image
                              ? `${backendUrl}${s.image}`
                              : "/placeholder-rect.png"
                          }
                          alt={s.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="
                        bg-sky-50 text-sky-700 px-3 py-1 rounded-full
                        text-sm font-semibold
                      ">
                        ₹{s.price}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {s.name}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="text-sm font-medium text-gray-700">4.8</span>
                      </div>
                    <div
                      onClick={() =>
                        isLoggedIn
                          ? servicesRef.current?.scrollIntoView({ behavior: 'smooth' })
                          : navigate("/login-customer")
                      }
                      className="
                        text-sky-600 font-semibold flex items-center gap-1
                        group-hover:text-sky-700 transition-colors cursor-pointer
                      ">
                        Book Now
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">No services available in this category.</div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-sky-600 hover:text-sky-700 font-medium"
                  >
                    Browse other categories
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* How It Works & Testimonials */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* How It Works */}
          <div className="lg:col-span-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Book a Service</h4>
                <p className="text-white/80 text-sm">
                  Choose your service and preferred time slot
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Get Verified Pros</h4>
                <p className="text-white/80 text-sm">
                  Expert technicians arrive at your doorstep
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">Pay & Rate</h4>
                <p className="text-white/80 text-sm">
                  Pay after service completion and rate your experience
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials */}
        
        </div>

        {/* Bottom Banners */}
        <section 
          className="mb-16"
          ref={servicesRef}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-3xl font-bold text-gray-900">Featured Services</h3>
              <p className="text-gray-600 mt-2">Most requested professional services</p>
            </div>
            <button className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-2">
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 2800, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{
              480: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
              1280: { slidesPerView: 4 },
            }}
            className="!pb-12"
            spaceBetween={24}
          >
            {bottomBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="
                    h-64 bg-cover bg-center rounded-2xl overflow-hidden relative
                    shadow-lg hover:shadow-2xl transition-shadow duration-300
                    group cursor-pointer
                  "
                  style={{ backgroundImage: `url(${src})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="text-white transform group-hover:-translate-y-2 transition-transform duration-300">
                      <div className="text-xl font-bold mb-2">Professional Service</div>
                      <div className="text-white/90 text-sm mb-4">Book now and get 20% off</div>
                      <button className="
                        bg-white text-gray-900 py-2 px-4 rounded-lg text-sm font-semibold
                        hover:bg-gray-100 transition-colors
                      ">
                        Book Service
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-8 md:p-12 text-center text-white mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Book Your Service?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust us with their home service needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() =>
                isLoggedIn
                  ? servicesRef.current?.scrollIntoView({ behavior: 'smooth' })
                  : navigate("/login-customer")
              }
              className="
                bg-white text-sky-700 py-3 px-8 rounded-full font-semibold text-lg
                hover:scale-[1.02] hover:shadow-2xl transition-all duration-300
              "
            >
              {isLoggedIn ? "Book Service Now" : "Get Started Free"}
            </button>
            <button className="
              border-2 border-white text-white py-3 px-8 rounded-full font-semibold text-lg
              hover:bg-white/10 transition-all duration-300
            ">
              Download App
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 text-center border-t border-gray-200">
        
          <p className="text-gray-600">
            © {new Date().getFullYear()} Technosys Home Services. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CustomerDashboard;