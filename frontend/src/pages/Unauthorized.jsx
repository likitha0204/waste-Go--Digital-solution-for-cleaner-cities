import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="container">
      <h1>Unauthorized Access</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/" style={{ color: '#646cff' }}>Return to Home</Link>
    </div>
  );
};

export default Unauthorized;
