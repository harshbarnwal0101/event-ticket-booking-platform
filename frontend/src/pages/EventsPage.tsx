import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import '../styles/Events.css';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  startDateTime: string;
  basePrice: number;
  status: string;
  ticketsAvailable: number;
}

interface TicketType {
  _id: string;
  name: string;
  description?: string;
  price: number;
  availableQuantity: number;
}

interface Seat {
  _id: string;
  seatLabel: string;
  row: string;
  number: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
}

interface EventsProps {
  onLogout: () => void;
  user: any;
}

export const EventsPage: React.FC<EventsProps> = ({ onLogout, user }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [bookingForm, setBookingForm] = useState({
    customerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
    paymentMethod: 'UPI',
  });

  useEffect(() => {
    fetchEvents();
  }, [search]);

  useEffect(() => {
    const liveSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      withCredentials: true,
    });
    setSocket(liveSocket);

    return () => {
      liveSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selectedEvent || !socket) {
      return;
    }

    socket.emit('event:join', selectedEvent._id);

    const handleSeatUpdate = ({ eventId, seatIds, status }: { eventId: string; seatIds: string[]; status: string }) => {
      if (eventId !== selectedEvent._id) {
        return;
      }

      setSeats((currentSeats) =>
        currentSeats.map((seat) =>
          seatIds.includes(seat._id)
            ? { ...seat, status: status === 'BOOKED' ? 'BOOKED' : seat.status }
            : seat
        )
      );
    };

    socket.on('seats:updated', handleSeatUpdate);

    return () => {
      socket.off('seats:updated', handleSeatUpdate);
    };
  }, [selectedEvent, socket]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`http://localhost:5000/api/events/search${query}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data.events);
      } else {
        setError(data.message || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Error fetching events');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    onLogout();
  };

  const openEvent = async (event: Event) => {
    setSelectedEvent(event);
    setSelectedTicketTypeId('');
    setSelectedSeatIds([]);
    setTicketLoading(true);
    try {
      const [ticketResponse, seatResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/events/${event._id}/ticket-types`),
        fetch(`http://localhost:5000/api/events/${event._id}/seats`),
      ]);

      const ticketData = await ticketResponse.json();
      const seatData = await seatResponse.json();

      setTicketTypes(ticketData.success ? ticketData.data.ticketTypes : []);
      setSeats(seatData.success ? seatData.data.seats : []);
      if (ticketData.success && ticketData.data.ticketTypes.length > 0) {
        setSelectedTicketTypeId(ticketData.data.ticketTypes[0]._id);
      }
    } catch {
      setTicketTypes([]);
      setSeats([]);
    } finally {
      setTicketLoading(false);
    }
  };

  const toggleSeat = (seatId: string) => {
    setSelectedSeatIds((current) =>
      current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId]
    );
  };

  const selectedTicket = ticketTypes.find((ticket) => ticket._id === selectedTicketTypeId);
  const seatTotal = selectedTicket ? selectedSeatIds.length * selectedTicket.price : 0;

  const handleCheckoutSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedEvent || !selectedTicket || selectedSeatIds.length === 0) {
      return;
    }

    setBookingSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          ticketTypeId: selectedTicketTypeId,
          seatIds: selectedSeatIds,
          paymentMethod: bookingForm.paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Booking failed');
      }

      const bookingReference = data.data?.booking?.bookingReference || 'BK-UNKNOWN';
      alert(
        `Booking confirmed for ${bookingForm.customerName || 'Guest'}! Reference: ${bookingReference}. Total: ₹${seatTotal}.`
      );

      setCheckoutOpen(false);
      setSelectedEvent(null);
      setSelectedSeatIds([]);
      setSelectedTicketTypeId('');
      setTicketTypes([]);
      setSeats([]);
    } catch (error: any) {
      alert(error.message || 'Unable to confirm booking. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="events-page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🎫 Event Ticket Booking</h1>
          <div className="header-actions">
            <span className="user-info">Welcome, {user?.firstName || 'Guest'}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search events by title, artist, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Events Display */}
      <div className="events-container">
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="no-events">No events found. Try a different search!</div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div
                key={event._id}
                className="event-card"
                onClick={() => openEvent(event)}
              >
                <div className="event-category">{event.category}</div>
                <h3>{event.title}</h3>
                <p className="event-date">
                  📅 {new Date(event.startDateTime).toLocaleDateString()}
                </p>
                <p className="event-price">💰 From ₹{event.basePrice}</p>
                <p className="event-tickets">
                  🎟️ {event.ticketsAvailable} tickets available
                </p>
                <button className="view-btn">View Details</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedEvent(null)}>
              ✕
            </button>
            <h2>{selectedEvent.title}</h2>
            <p className="modal-category">Category: {selectedEvent.category}</p>
            <p className="modal-desc">{selectedEvent.description}</p>
            <div className="modal-details">
              <div className="detail-item">
                <strong>Date:</strong> {new Date(selectedEvent.startDateTime).toLocaleDateString()}
              </div>
              <div className="detail-item">
                <strong>Time:</strong> {new Date(selectedEvent.startDateTime).toLocaleTimeString()}
              </div>
              <div className="detail-item">
                <strong>Price:</strong> ₹{selectedEvent.basePrice}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {selectedEvent.status}
              </div>
              <div className="detail-item">
                <strong>Tickets Available:</strong> {selectedEvent.ticketsAvailable}
              </div>
            </div>
            <div className="ticket-types">
              <h3>Ticket options</h3>
              {ticketLoading ? (
                <div className="loading">Loading ticket options...</div>
              ) : ticketTypes.length === 0 ? (
                <p className="no-ticket-types">No ticket types configured yet.</p>
              ) : (
                <div className="ticket-options">
                  {ticketTypes.map((ticketType) => (
                    <button
                      key={ticketType._id}
                      type="button"
                      className={`ticket-type-card ${selectedTicketTypeId === ticketType._id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedTicketTypeId(ticketType._id);
                        setSelectedSeatIds([]);
                      }}
                    >
                      <div>
                        <strong>{ticketType.name}</strong>
                        {ticketType.description && <p>{ticketType.description}</p>}
                        <small>{ticketType.availableQuantity} available</small>
                      </div>
                      <span>₹{ticketType.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user?.role === 'CUSTOMER' && selectedTicketTypeId && (
              <div className="seat-selection-panel">
                <h3>Select seats</h3>
                <div className="seat-map">
                  {seats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat._id);
                    const isAvailable = seat.status === 'AVAILABLE';

                    return (
                      <button
                        key={seat._id}
                        type="button"
                        className={`seat ${isSelected ? 'selected' : ''} ${!isAvailable ? 'taken' : ''}`}
                        disabled={!isAvailable}
                        onClick={() => toggleSeat(seat._id)}
                        title={`${seat.seatLabel} - ${seat.status}`}
                      >
                        {seat.seatLabel}
                      </button>
                    );
                  })}
                </div>

                {selectedSeatIds.length > 0 && selectedTicket && (
                  <div className="booking-summary">
                    <p>
                      {selectedSeatIds.length} seat(s) selected • {selectedTicket.name}
                    </p>
                    <strong>Total: ₹{seatTotal}</strong>
                  </div>
                )}
              </div>
            )}

            {user?.role === 'CUSTOMER' && selectedSeatIds.length > 0 && selectedTicket && (
              <>
                {!checkoutOpen ? (
                  <button className="book-btn" onClick={() => setCheckoutOpen(true)}>
                    Book selected seats — ₹{seatTotal} 🎟️
                  </button>
                ) : (
                  <form className="checkout-panel" onSubmit={handleCheckoutSubmit}>
                    <h4>Checkout</h4>
                    <div className="checkout-grid">
                      <label>
                        Full name
                        <input
                          type="text"
                          value={bookingForm.customerName}
                          onChange={(event) =>
                            setBookingForm((current) => ({ ...current, customerName: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={bookingForm.email}
                          onChange={(event) =>
                            setBookingForm((current) => ({ ...current, email: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Payment method
                        <select
                          value={bookingForm.paymentMethod}
                          onChange={(event) =>
                            setBookingForm((current) => ({ ...current, paymentMethod: event.target.value }))
                          }
                        >
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Wallet">Wallet</option>
                        </select>
                      </label>
                    </div>

                    <div className="checkout-summary">
                      <span>{selectedSeatIds.length} seat(s)</span>
                      <span>{selectedTicket.name}</span>
                      <strong>₹{seatTotal}</strong>
                    </div>

                    <div className="checkout-actions">
                      <button type="button" className="secondary-btn" onClick={() => setCheckoutOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="book-btn checkout-submit" disabled={bookingSubmitting}>
                        {bookingSubmitting ? 'Confirming...' : 'Confirm booking'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
