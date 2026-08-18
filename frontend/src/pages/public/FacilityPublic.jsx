import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Clock, Gamepad2, ArrowLeft, Smartphone } from 'lucide-react';
import { facilityService } from '../../services/facilityService';
import { slotService } from '../../services/slotService';
import { bookingService } from '../../services/bookingService';
import { authService } from '../../services/authService';
import { useDispatch } from 'react-redux';
import { verifyOtp } from '../../store/slices/authSlice';

const FacilityPublic = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [facility, setFacility] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedResource, setSelectedResource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booker, setBooker] = useState({ mobile: '', name: '', note: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await facilityService.getPublicBySlug(slug);
        setFacility(payload.data.facility);
        setResources(payload.data.facility.resources || []);
        if (payload.data.facility.resources?.length) setSelectedResource(payload.data.facility.resources[0].id);
      } catch {
        toast.error('Facility not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!selectedResource || !date) return;
    const loadSlots = async () => {
      setSlotLoading(true);
      setSelectedSlot(null);
      setStep(1);
      try {
        const payload = await slotService.availability({ resourceId: selectedResource, date });
        setSlots(payload.data.slots);
      } catch {
        setSlots([]);
      } finally {
        setSlotLoading(false);
      }
    };
    loadSlots();
  }, [selectedResource, date]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16"><div className="h-80 bg-slate-100 rounded-2xl animate-pulse" /></div>;
  }

  if (!facility) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
        <p>Facility not found.</p>
        <Link to="/" className="text-primary-600 font-medium">← Back to TurfBook</Link>
      </div>
    );
  }

  const handleSendOtp = async () => {
    try {
      const payload = await authService.requestOtp(booker.mobile);
      setDevCode(payload.data.devCode || null);
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setBookingSubmitting(true);
    try {
      const method = document.getElementById('pay-method').value;
      if (method !== 'CASH' && !booker.note) {
        toast.error('Please enter your transaction ID');
        return;
      }
      const payload = await bookingService.create({
        resourceId: selectedResource,
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        mobile: booker.mobile,
        customerName: booker.name,
        paymentMethod: method,
        transactionId: method === 'CASH' ? undefined : booker.note,
      });
      const created = payload.data.booking;
      toast.success(`Booking ${created.bookingNo} submitted — awaiting payment verification`);
      setTimeout(() => navigate('/'), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingSubmitting(false);
    }
  };


  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to search
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center">
          <Gamepad2 className="w-16 h-16 text-primary-400" />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
              <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {facility.address?.street || ''} {facility.address?.city || ''} {facility.address?.division || ''}
              </p>
            </div>
            <span className="text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-3 py-1">
              {facility.type}
            </span>
          </div>
          {facility.description && (
            <p className="mt-4 text-sm text-slate-600">{facility.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {facility.operatingHours?.open || '08:00'} – {facility.operatingHours?.close || '23:00'}
            </span>
            {facility.operatingHours?.days?.length > 0 && (
              <span>Open {facility.operatingHours.days.join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-5">Book a slot</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ground / resource</label>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — ৳{r.basePrice}/hr {r.status === 'INACTIVE' ? '(unavailable)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {slotLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No slots available for this date.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {slots.map((s) => {
              const taken = s.status !== 'AVAILABLE';
              const isSelected = selectedSlot?.id === s.id;
              const price = s.isPeak ? s.peakPrice || s.price : s.price;
              return (
                <button
                  key={s.id}
                  disabled={taken}
                  onClick={() => {
                    setSelectedSlot(s);
                    setStep(2);
                  }}
                  className={`rounded-lg border p-3 text-center transition-all ${
                    taken
                      ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary-600 border-primary-600 text-white shadow'
                        : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  <div className="text-sm font-semibold">{s.startTime.slice(0, 5)}</div>
                  <div className={`text-xs mt-0.5 ${taken ? '' : isSelected ? 'text-primary-100' : 'text-slate-500'}`}>
                    {taken ? 'Booked' : `৳${price}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Step {step} {step === 2 ? 'of 2' : ''} — Confirm your booking
              <span className="text-slate-500 font-normal"> ({selectedSlot.startTime.slice(0, 5)} – {selectedSlot.endTime.slice(0, 5)}, {date})</span>
            </h3>

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile number *</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        pattern="01[3-9][0-9]{8}"
                        required
                        placeholder="01XXXXXXXXX"
                        value={booker.mobile}
                        onChange={(e) => setBooker((b) => ({ ...b, mobile: e.target.value }))}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                      />
                      {!otpSent && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                        >
                          Get OTP
                        </button>
                      )}
                    </div>
                  </div>
                  {otpSent && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">OTP *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          required
                          placeholder="6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const result = await dispatch(verifyOtp({ mobile: booker.mobile, code: otpCode }));
                              if (result.meta.requestStatus === 'rejected') {
                                toast.error(result.payload || 'Invalid OTP');
                              } else {
                                toast.success('OTP verified — you are logged in');
                              }
                            } catch (error) {
                              toast.error(error.response?.data?.message || 'Invalid OTP');
                            }
                          }}
                          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                        >
                          Verify
                        </button>
                      </div>
                      {devCode && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Development mode — OTP is <strong>{devCode}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Your name</label>
                    <input
                      value={booker.name}
                      onChange={(e) => setBooker((b) => ({ ...b, name: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment method *</label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select id="pay-method" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500">
                        <option value="BKASH">bKash</option>
                        <option value="NAGAD">Nagad</option>
                        <option value="CASH">Cash at venue</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Transaction ID <span className="text-slate-400 font-normal">(for bKash/Nagad payment proof)</span>
                  </label>
                  <input
                    value={booker.note}
                    onChange={(e) => setBooker((b) => ({ ...b, note: e.target.value }))}
                    placeholder="e.g. 9H7X2K5L1M — send money to the facility's bKash number shown on the venue"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">
                      {selectedSlot.startTime.slice(0, 5)} – {selectedSlot.endTime.slice(0, 5)} · {date}
                    </p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      ৳{selectedSlot.isPeak ? selectedSlot.peakPrice : selectedSlot.price}
                      {selectedSlot.isPeak && <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Peak rate</span>}
                    </p>
                    <p className="text-xs text-slate-400">Platform service fee ৳15 included</p>
                  </div>
                  <button
                    type="button"
                    disabled={bookingSubmitting || !booker.mobile || !otpSent}
                    onClick={handleConfirmBooking}
                    className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {bookingSubmitting ? 'Booking…' : 'Confirm booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacilityPublic;