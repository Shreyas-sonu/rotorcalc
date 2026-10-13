import { Clause, Legal, Mail } from "@/components/landing/Legal";
import { BRAND } from "@/lib/brand";
import { MAX_DEVICES } from "@/lib/limits";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <Legal title="Privacy policy" updated="13 October 2026">
      <Clause title="What this covers">
        <p>
          {BRAND.name} is an online calculator for steam turbines and boilers. This page says what we keep about you when you use it, why, and how to
          have it removed.
        </p>
      </Clause>
      <Clause title="What we keep">
        <ul>
          <li>
            <strong className="text-ink">Your account:</strong> your name, your email address and, if you give it, your company. If you register with a
            password, it is stored only in scrambled form and we cannot read it.
          </li>
          <li>
            <strong className="text-ink">Google sign-in:</strong> if you choose to continue with Google, Google gives us your name, your email address,
            your profile picture address and an identifier for your Google account. We do not see your Google password and we do not get access to your
            mail, contacts, files or anything else in your Google account.
          </li>
          <li>
            <strong className="text-ink">Your devices:</strong> each account works on up to {MAX_DEVICES} devices, one signed in at a time. To enforce
            that we keep a random identifier for each browser you sign in from, its browser and operating system name, and when it was first and last
            used.
          </li>
          <li>
            <strong className="text-ink">Your calculations:</strong> the inputs and results of the calculations you choose to save, with the names you
            give them.
          </li>
          <li>
            <strong className="text-ink">Your plan:</strong> which plan you are on and its dates. Payment is in test mode: no money is taken, and the
            card or UPI details on the checkout screen are not sent to us or stored.
          </li>
        </ul>
      </Clause>
      <Clause title="What we use it for">
        <p>
          To sign you in, to keep your saved calculations, to apply your plan and the device limit, and to answer you when you write to us. We do not
          sell your data, we do not show advertising, and we do not use your data, including what Google gives us, for anything else.
        </p>
      </Clause>
      <Clause title="Cookies">
        <p>
          We set only the cookies the service needs: one that keeps you signed in and one that identifies your device for the device limit. There are no
          advertising or tracking cookies.
        </p>
      </Clause>
      <Clause title="Who else handles it">
        <p>
          Accounts and saved data are stored with Supabase, our database and sign-in provider. The site is served by Vercel, which keeps ordinary
          server logs such as IP addresses. Google is involved only if you sign in with Google. We share your data with no one else unless the law
          requires it.
        </p>
      </Clause>
      <Clause title="Keeping and deleting">
        <p>
          We keep your data for as long as you have an account. You can delete a saved calculation or remove a device yourself at any time. To have your
          account and everything in it deleted, or to get a copy of what we hold, write to <Mail />.
        </p>
      </Clause>
      <Clause title="Changes and contact">
        <p>
          If this policy changes, the date at the top changes with it. Questions go to <Mail />.
        </p>
      </Clause>
    </Legal>
  );
}
