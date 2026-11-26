import Link from "next/link";
import { site } from "@/lib/site";

export function BudgetHero() {
  return (
    <section className="budget-hero">
      <div className="hero-copy">
        <span className="release-tag"><i /> Version {site.version} is live</span>
        <h1>A fuel tank for<br />your <em>AI agent.</em></h1>
        <p>Give your eve agent a token budget it can see. Plan each turn, spot repeated calls, and leave room for the final answer.</p>
        <div className="hero-actions"><Link href="/docs/installation">Get started <span>↗</span></Link><Link href="/docs/how-it-works">How it works →</Link></div>
      </div>
      <figure className="report-preview">
        <figcaption><span className="status-dot" /> Tank report <small>EXAMPLE / 01</small></figcaption>
        <div className="report-body">
          <div className="report-summary"><span>Budget remaining</span><strong>22.13<em>%</em></strong><div className="fuel-gauge" aria-hidden="true"><i /></div><p>1,770 of 8,000 tokens</p><b>● Low fuel</b></div>
          <div className="report-chart"><span>Turn activity</span>
            <svg viewBox="0 0 210 110" role="img" aria-label="Tokens remaining drop from 8,000 to 4,885, then to an estimated 1,770.">
              <defs><pattern id="report-grid" width="24" height="22" patternUnits="userSpaceOnUse"><path d="M24 0H0V22" fill="none" stroke="#dce7df" strokeWidth="1" /></pattern></defs>
              <rect width="210" height="110" fill="url(#report-grid)" />
              <g className="activity-trace">
                <path d="M3 8H74V48H146V83H205V109H3Z" fill="#c5dfca" opacity=".55" />
                <path d="M3 8H74V48H146" fill="none" stroke="#538268" strokeWidth="3" />
                <path d="M146 48V83H205" stroke="#538268" strokeWidth="3" strokeDasharray="4 3" fill="none" />
                <circle cx="205" cy="83" r="4" fill="#477b60" />
              </g>
            </svg><small>START <span>IN FLIGHT</span></small>
          </div>
        </div>
        <div className="report-foot"><span>tankful__check_tank</span><span>Estimated usage</span></div>
      </figure>
      <span className="hero-index">FIG. 01 &nbsp; / &nbsp; PER-TURN BUDGET</span>
    </section>
  );
}
