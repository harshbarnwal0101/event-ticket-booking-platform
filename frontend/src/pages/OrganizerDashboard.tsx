import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Dashboard.css';

interface OrganizerEvent {
  _id: string;
  title: string;
  category: string;
  status: string;
  startDateTime: string;
  basePrice: number;
  ticketsAvailable: number;
  ticketsSold: number;
}

interface DashboardProps {
  onLogout: () => void;
  user: any;
}

export const OrganizerDashboard: React.FC<DashboardProps> = ({ onLogout, user }) => {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venueId: '',
    category: 'CONCERT',
    startDateTime: '',
    endDateTime: '',
    totalCapacity: '1000',
    basePrice: '100',
  });
  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const fetchOrganizerEvents = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:5000/api/events/organizer/my-events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setEvents(data.data.events);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    onLogout();
  };

  const analytics = useMemo(() => {
    const totalRevenue = events.reduce((sum, event) => sum + (Number(event.ticketsSold || 0) * Number(event.basePrice || 0)), 0);
    const totalTicketsSold = events.reduce((sum, event) => sum + Number(event.ticketsSold || 0), 0);
    const totalTicketsAvailable = events.reduce((sum, event) => sum + Number(event.ticketsAvailable || 0), 0);
    const publishedEvents = events.filter((event) => event.status === 'PUBLISHED').length;
    const totalEvents = events.length;
    const occupancyRate = totalTicketsSold + totalTicketsAvailable === 0
      ? 0
      : (totalTicketsSold / (totalTicketsSold + totalTicketsAvailable)) * 100;
    const topCategory = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRevenue,
      totalTicketsSold,
      totalTicketsAvailable,
      publishedEvents,
      totalEvents,
      occupancyRate,
      topCategory: Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0],
    };
  }, [events]);

  const updateForm = (field: string, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    try {
      const response = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          ...formData,
          totalCapacity: Number(formData.totalCapacity),
          basePrice: Number(formData.basePrice),
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setFormError(data.message || 'Unable to create event');
        return;
      }

      setFormData({
        title: '',
        description: '',
        venueId: '',
        category: 'CONCERT',
        startDateTime: '',
        endDateTime: '',
        totalCapacity: '1000',
        basePrice: '100',
      });
      setShowCreateForm(false);
      await fetchOrganizerEvents();
    } catch {
      setFormError('Unable to reach the backend. Check that it is running.');
    }
  };

  const updateEventStatus = async (eventId: string, action: 'publish' | 'cancel') => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      if (!data.success) {
        setFormError(data.message || `Unable to ${action} event`);
        return;
      }
      await fetchOrganizerEvents();
    } catch {
      setFormError('Unable to reach the backend. Check that it is running.');
    }
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🎭 Organizer Dashboard</h1>
          <div className="header-actions">
            <span className="user-info">Welcome, {user?.firstName || 'Organizer'}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Create Event Button */}
        <button
          className="create-event-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create New Event'}
        </button>

        {/* Create Form */}
        {showCreateForm && (
          <div className="create-form-container">
            <h2>Create New Event</h2>
            {formError && <div className="error-banner">{formError}</div>}
            <form className="event-form" onSubmit={createEvent}>
              <input placeholder="Event title" value={formData.title} onChange={(e) => updateForm('title', e.target.value)} required />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => updateForm('description', e.target.value)} required />
              <input placeholder="Venue ID" value={formData.venueId} onChange={(e) => updateForm('venueId', e.target.value)} required />
              <select value={formData.category} onChange={(e) => updateForm('category', e.target.value)}>
                {['CONCERT', 'CONFERENCE', 'SPORTS', 'THEATER', 'FESTIVAL', 'WORKSHOP', 'SEMINAR', 'EXHIBITION', 'OTHER'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <label>Starts<input type="datetime-local" value={formData.startDateTime} onChange={(e) => updateForm('startDateTime', e.target.value)} required /></label>
              <label>Ends<input type="datetime-local" value={formData.endDateTime} onChange={(e) => updateForm('endDateTime', e.target.value)} required /></label>
              <input type="number" min="1" placeholder="Capacity" value={formData.totalCapacity} onChange={(e) => updateForm('totalCapacity', e.target.value)} required />
              <input type="number" min="0" step="0.01" placeholder="Base price" value={formData.basePrice} onChange={(e) => updateForm('basePrice', e.target.value)} required />
              <button className="create-event-btn" type="submit">Create Draft Event</button>
            </form>
          </div>
        )}

        {!loading && (
          <div className="analytics-section">
            <h2>Real analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-label">Revenue</span>
                <strong>₹{analytics.totalRevenue.toLocaleString('en-IN')}</strong>
                <small>{analytics.totalTicketsSold} tickets sold</small>
              </div>
              <div className="analytics-card">
                <span className="analytics-label">Tickets sold</span>
                <strong>{analytics.totalTicketsSold}</strong>
                <small>{analytics.totalTicketsAvailable} still available</small>
              </div>
              <div className="analytics-card">
                <span className="analytics-label">Published</span>
                <strong>{analytics.publishedEvents}</strong>
                <small>of {analytics.totalEvents} total events</small>
              </div>
              <div className="analytics-card">
                <span className="analytics-label">Occupancy</span>
                <strong>{analytics.occupancyRate.toFixed(1)}%</strong>
                <small>{analytics.topCategory ? `Top category: ${analytics.topCategory[0]}` : 'No category data yet'}</small>
              </div>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="events-section">
          <h2>Your Events</h2>

          {loading ? (
            <div className="loading">Loading your events...</div>
          ) : events.length === 0 ? (
            <div className="no-events">
              <p>No events created yet.</p>
              <p>Create your first event to get started! 🎉</p>
            </div>
          ) : (
            <div className="events-table-wrapper">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>Price</th>
                    <th>Tickets</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id}>
                      <td className="event-title">{event.title}</td>
                      <td className="event-category">{event.category}</td>
                      <td>
                        <span className={`status-badge status-${event.status.toLowerCase()}`}>
                          {event.status}
                        </span>
                      </td>
                      <td>{new Date(event.startDateTime).toLocaleDateString()}</td>
                      <td>₹{event.basePrice}</td>
                      <td>
                        <span className="ticket-info">
                          {event.ticketsSold} sold / {event.ticketsAvailable} available
                        </span>
                      </td>
                      <td className="actions">
                        {event.status === 'DRAFT' && (
                          <button className="action-btn publish-btn" onClick={() => updateEventStatus(event._id, 'publish')}>Publish</button>
                        )}
                        {event.status === 'PUBLISHED' && (
                          <button className="action-btn cancel-btn" onClick={() => updateEventStatus(event._id, 'cancel')}>Cancel</button>
                        )}
                        <button className="action-btn view-btn">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
