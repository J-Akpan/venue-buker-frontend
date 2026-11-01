import React from 'react'

export default class ErrorBoundary extends React.Component {
    state = { failed: false }
    static getDerivedStateFromError() {
        return { failed: true }
    }
    componentDidCatch(error, info) {
        console.error('Unhandled UI error', error, info)
    }
    render() {
        if (!this.state.failed) return this.props.children
        return (
            <div className="state-box" style={{ margin: '20vh auto', maxWidth: 480 }} role="alert">
                <h2>Something went wrong</h2>
                <p className="muted">An unexpected error occurred. Reloading usually fixes it.</p>
                <button className="btn" onClick={() => window.location.assign('/')}>Reload VenBuk</button>
            </div>
        )
    }
}
