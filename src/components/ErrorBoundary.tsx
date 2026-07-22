import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Daily Canvas render failure", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="recovery-screen">
        <span className="logo-mark">DC</span>
        <h1>Daily Canvas needs a fresh start</h1>
        <p>Your local data has not been deleted. Reload the app first; reset local storage only if the problem continues.</p>
        <div className="inline-actions">
          <button className="button primary" type="button" onClick={() => globalThis.location.reload()}>Reload</button>
          <button className="button secondary" type="button" onClick={() => this.setState({ error: undefined })}>Try again</button>
        </div>
        <details><summary>Technical details</summary><code>{this.state.error.message}</code></details>
      </main>
    );
  }
}
