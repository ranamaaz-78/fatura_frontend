import { useEffect, useState } from 'react';
import api from '../services/api';

function Home() {
  const [status, setStatus] = useState('loading');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get('/health')
      .then((response) => {
        if (cancelled) return;
        setTime(response.data.time || '');
        setStatus('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err.response?.data?.message || err.message || 'Unknown error';
        setError(message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="home">
      {status === 'loading' && <p>Connecting...</p>}
      {status === 'ok' && (
        <div>
          <p>Backend connected</p>
          {time ? <p className="meta">{time}</p> : null}
        </div>
      )}
      {status === 'error' && (
        <div>
          <p>Backend not reachable</p>
          <p className="meta">{error}</p>
        </div>
      )}
    </main>
  );
}

export default Home;
