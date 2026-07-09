  import { useState, useEffect } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import EditTicketModal from '../components/tickets/EditTicketModal';
  import Layout from '../components/layout/Layout';
  import LoadingSpinner from '../components/ui/LoadingSpinner';
  import { useAuth } from '../context/AuthContext';
  import api from '../api/axios';

  export default function EditTicketPage() {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchTicket = async () => {
        try {
          const res = await api.get(`/tickets/${ticketId}`);
          setTicket(res.data);
        } catch (err) {
          console.error('Failed to fetch ticket:', err);
          navigate('/tickets');
        } finally {
          setLoading(false);
        }
      };
      fetchTicket();
    }, [ticketId, navigate]);

    const handleUpdated = (updatedTicket) => {
      setTicket(updatedTicket);
      navigate('/tickets');
    };

    if (loading) return (
      <Layout>
        <LoadingSpinner text="Loading ticket..." />
      </Layout>
    );

    if (!ticket) return (
      <Layout>
        <div className="p-12 text-center">
          <div className="text-slate-500">Ticket not found</div>
        </div>
      </Layout>
    );

    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto">
          <EditTicketModal 
            ticket={ticket} 
            onClose={() => navigate('/tickets')} 
            onUpdated={handleUpdated} 
          />
        </div>
      </Layout>
    );
  }
