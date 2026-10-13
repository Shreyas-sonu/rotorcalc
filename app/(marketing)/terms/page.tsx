import { Clause, Legal, Mail } from "@/components/landing/Legal";
import { BRAND } from "@/lib/brand";
import { MAX_DEVICES } from "@/lib/limits";
import { TRIAL_DAYS } from "@/lib/plans";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <Legal title="Terms of service" updated="13 October 2026">
      <Clause title="The service">
        <p>
          {BRAND.name} calculates steam turbine power, efficiency and steam flow, and boiler steam generation, from the figures you enter. By creating an
          account you agree to these terms.
        </p>
      </Clause>
      <Clause title="Engineering estimates">
        <p>
          Results are engineering estimates based on the IAPWS-IF97 steam properties and on the efficiencies and losses you supply. They are not a
          guarantee of how any machine will perform. Confirm with the manufacturer before using a result for design, purchase, safety or contractual
          purposes. You are responsible for the figures you enter and for how you use the results.
        </p>
      </Clause>
      <Clause title="Your account">
        <ul>
          <li>An account is for one person. Do not share your sign-in.</li>
          <li>
            Each account works on up to {MAX_DEVICES} devices, with one signed in at a time. Signing in on one device signs the other out.
          </li>
          <li>Keep your password to yourself, and tell us if you think someone else has used your account.</li>
        </ul>
      </Clause>
      <Clause title="Plans and payment">
        <p>
          The trial is free for {TRIAL_DAYS} days. Paid plans and their prices are shown on the pricing page and exclude GST. During the preview, payment
          is in test mode and no money is taken. Before real payments start, the price, billing period and refund terms will be shown at checkout.
        </p>
      </Clause>
      <Clause title="Fair use">
        <p>
          Do not try to get around the plan, session or device limits, copy the service, overload it, or use it to break the law. We may suspend an
          account that does.
        </p>
      </Clause>
      <Clause title="Liability">
        <p>
          The service is provided as it is. To the extent the law allows, we are not liable for loss or damage arising from reliance on a result, from
          the service being unavailable, or from loss of saved data.
        </p>
      </Clause>
      <Clause title="Changes and contact">
        <p>
          We may change the service or these terms; the date at the top shows the latest version. Questions go to <Mail />.
        </p>
      </Clause>
    </Legal>
  );
}
