
import React, { useState } from 'react';

interface PasswordModalProps {
    onAuthenticated: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onAuthenticated }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validPasswords = ['Miami2025', 'Eranker', '518273', 'imagegenerator'];
        // Case-insensitive check
        if (validPasswords.map(p => p.toLowerCase()).includes(password.toLowerCase())) {
            setError('');
            onAuthenticated();
        } else {
            setError('Incorrect password. Please try again.');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
            <div className="bg-[#1C1C1E] border border-neutral-800 rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
                <h2 className="text-2xl font-bold mb-2 text-white">Authentication Required</h2>
                <p className="text-neutral-400 mb-6">Please enter the password to access the application.</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        className={`bg-neutral-800 border border-neutral-700 rounded-lg p-3 w-full text-center focus:ring-2 focus:border-orange-500 transition ${error ? 'border-red-500 ring-red-500/50' : 'focus:ring-orange-500'}`}
                        aria-invalid={!!error}
                        aria-describedby="password-error"
                    />
                     {error && <p id="password-error" className="text-red-400 text-sm -mt-2">{error}</p>}
                    <button 
                        type="submit" 
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-orange-500/20 disabled:text-orange-500/50 disabled:cursor-not-allowed"
                        disabled={!password}
                    >
                        Unlock
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;