import { Accordion, AccordionItem } from "./Accordion";

/**
 * The FAQ itself — the four sections of imageshield.com/faq, copy for copy.
 *
 * Every string here is transcribed from the live page rather than rewritten, down
 * to the mixed dashes in "How does ImageShield work?" (an en dash on five bullets,
 * a hyphen on "Protection You Can Trust") and the "unidentifable" typo in the last
 * section. Those are the old site's, and this page is a copy of it — fix them
 * there and they can be fixed here.
 *
 * There is no design for this page yet, so the layout is the old site's too: a
 * 56rem column, sections 48px apart, and each answer's paragraph and list spacing
 * exactly as its markup sets it.
 */
export function FaqSections() {
  return (
    <>
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">ABOUT IMAGESHIELD®</h2>
        <Accordion>
          <AccordionItem value="what-is" question="What is ImageShield?">
            <p className="mb-4">
              ImageShield® is the first and only U.S.-based personal security
              solution built to protect consumers and their families from the
              abuse of their likenesses online. Today, image abusers can use
              technology to:
            </p>
            <ul className="mb-4 ml-4 list-inside list-disc space-y-2">
              <li>
                Create an image featuring your likeness in an attempt to bully
                you, damage your reputation, or blackmail you
              </li>
              <li>{"Circulate intimate images you've shared, without consent"}</li>
              <li>Generate deepfake pornography</li>
              <li>Impersonate you in scams and fraud</li>
            </ul>
            <p>
              Our patented Verified Facial Search™ technology ensures that only
              you can search for and monitor your likeness and the likenesses of
              family members, while our 24/7 proactive monitoring and direct
              takedown tools enable you to track and stop image abuse before it
              damages your reputation, identity, or financial health. Your face
              is your most valuable identifier, your reputation, and your
              security. Protect it with ImageShield.
            </p>
          </AccordionItem>

          <AccordionItem value="how-works" question="How does ImageShield work?">
            <p className="mb-4">
              ImageShield® works around the clock to safeguard individuals and
              their families from the abuse of their likenesses online through:
            </p>
            <ul className="ml-4 list-inside list-disc space-y-2">
              <li>
                <strong>24/7 Monitoring</strong>
                {
                  ' – Our "always on," patented Verified Facial Search™ technology constantly scans the web for your likeness, including sensitive databases.'
                }
              </li>
              <li>
                <strong>Real-time Alerts</strong>
                {
                  " – You'll be notified immediately when your likeness is detected online."
                }
              </li>
              <li>
                <strong>Stalker Proof</strong>
                {
                  " – Only you can search for and monitor your face and the likenesses of family members."
                }
              </li>
              <li>
                <strong>Protection You Can Trust</strong>
                {
                  " - Made in America, with strict compliance with U.S. and international privacy and biometrics laws. Our privacy policy and practices have been reviewed and approved by TrustArc."
                }
              </li>
              <li>
                <strong>Takedown Request Tools</strong>
                {
                  " – We connect you directly to the platforms where 70% of the world's images are shared, making it easy to report and remove abuse."
                }
              </li>
              <li>
                <strong>{'One-button "forget me" tool'}</strong>
                {" – Personal data easily deleted from the app."}
              </li>
            </ul>
          </AccordionItem>

          <AccordionItem value="cost" question="How much does ImageShield cost?">
            {
              "ImageShield is available on a personal or household subscription basis. $4.99 month/$49 year personal, or $7.99 month/$79 year household (up to five persons) subscription options are currently available. We've made it easy to subscribe, to cancel or unsubscribe, to change subscription type (from individual to household, or vice versa), and to delete all account data."
            }
          </AccordionItem>

          <AccordionItem
            value="app-or-website"
            question="Is ImageShield an app or a website?"
          >
            {
              "ImageShield is an app that's available for both iOS and Android devices."
            }
          </AccordionItem>

          <AccordionItem value="founder" question="Who founded ImageShield?">
            {
              "ImageShield was founded by Michael Gallagher, who in 2002 founded the Stevie® Awards, which are now widely regarded as the world's premier business awards programs. Michael conceived of ImageShield because he recognized that there was no tool available for regular people who want to protect their likeness, and the likenesses of family members, from online scammers, predators, and bullies."
            }
          </AccordionItem>
        </Accordion>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">
          IMAGESHIELD SECURITY AND PRIVACY
        </h2>
        <Accordion>
          <AccordionItem
            value="see-photos"
            question="Can ImageShield personnel see the photographs that I upload to the service?"
          >
            {
              "No, ImageShield personnel cannot see the photographs or other images you upload to the service. Only you can see them, in your Gallery, after logging into your account. We can only identify your photographs by numbers we've assigned to them. So if you ever need to contact us about a particular photograph, we'll ask you to tell us which number photograph you're referring to, and we'll tell you where to find that number in your Gallery of images."
            }
          </AccordionItem>

          <AccordionItem
            value="protect-info"
            question="How does ImageShield protect my personal and financial information that I share with the service?"
          >
            <p className="mb-4">
              {
                'Headquartered and operated in the U.S., ImageShield® has implemented a strict privacy policy and practices, which have been reviewed and approved by TrustArc. You can permanently delete your account and all associated data at any time with our one-button "forget me" tool, or we will automatically do so within 30 days of subscription cancellation. We observe strict compliance with U.S. and international privacy and biometrics laws. We do not share, sell, lease, trade, or otherwise disclose biometric information to third parties except when necessary to provide requested services, when required by law, or with your separate explicit written consent.'
              }
            </p>
            <p className="mb-2">
              ImageShield does not store the credit card numbers or other
              financial information provided by our subscribers. We only store
              transaction IDs, so that if in the future we need to issue a
              partial or full refund to a subscriber we need only submit the
              original transaction ID to our credit card payment processor.
            </p>
            <p>
              {
                "We do store account information, such as subscribers' names and email addresses, but only specific, authorized senior personnel at ImageShield will ever have access to that information."
              }
            </p>
          </AccordionItem>

          <AccordionItem
            value="validation"
            question="Have ImageShield's security practices and procedures been validated by an independent organization?"
          >
            {
              "Our security practices, policies and procedures have been reviewed and validated by TrustArc, and you'll find the TrustArc seal of approval in various places through our website and application."
            }
          </AccordionItem>
        </Accordion>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">PHOTOS</h2>
        <Accordion>
          <AccordionItem
            value="upload-types"
            question="What types of photos can I upload to ImageShield?"
          >
            ImageShield is intended to monitor the use of the likenesses of
            subscribers and their family members only. Subscribers should upload
            clear, recent photos that feature their face and/or the faces of
            family members, straight-on or in profile, that have been shared on
            social media or elsewhere. Among these photos should be the profile
            photos used on social media platforms.
          </AccordionItem>

          <AccordionItem
            value="cannot-upload"
            question="Which photos can I NOT upload to ImageShield?"
          >
            {
              "You may not use ImageShield to search for or monitor the likenesses of people other than yourself and family members. ImageShield's patented Verified Facial Search technology makes it impossible to use ImageShield as a stalker tool."
            }
          </AccordionItem>
        </Accordion>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">IMAGESHIELD PROTECTION</h2>
        <Accordion>
          <AccordionItem
            value="how-protect"
            question="How does ImageShield protect my likeness and the likenesses of my family members?"
          >
            <p className="mb-4">
              ImageShield protects your likeness and the likenesses of family
              members in several ways:
            </p>
            <ol className="list-inside list-decimal space-y-2">
              <li>
                ImageShield monitors the online world, 24 hours a day, for the
                use of your likeness, and reports to you where it finds it. You
                can decide whether uses are okay or are problematic, and take
                action if warranted.
              </li>
              <li>
                ImageShield makes it easy to report abuse on the most popular
                sites and platforms, including the following, on which more than
                70% of the photos worldwide are shared: Blogger, Facebook,
                Flickr, Imgur, Instagram, LinkedIn, Medium, OnlyFans, Pinterest,
                PornHub, Quora, Reddit, Snapchat, TikTok, Tumblr, Wordpress, X,
                and YouTube.
              </li>
            </ol>
            <p className="mt-4 mb-2">
              Technically, ImageShield works in two ways:
            </p>
            <ol className="list-inside list-decimal space-y-2">
              <li>
                Using multiple reverse-search APIs, ImageShield searches for the
                use of your photos. Results will show the use of your photos and
                nearly identical photos, which may indicate that your original
                photos have been altered and reshared.
              </li>
              <li>
                {
                  "To search for likenesses among content on sites and platforms that are noted for their generation or distribution of abusive content, ImageShield first generates facial signatures of its subscribers (after they consent to our generation and use of their biometric information). A subscriber's facial signature is then compared to the unidentified and unidentifable facial signatures in targeted content from specific sites and platforms. If a use of a subscriber's likeness is found, based on their facial signature, the location of that use is reported to the subscriber."
                }
              </li>
            </ol>
          </AccordionItem>

          <AccordionItem
            value="which-platforms"
            question="On which social media platforms and websites will ImageShield monitor the use of my likeness?"
          >
            <p className="mb-4">
              {
                "ImageShield monitors all social media platforms and websites, worldwide, including the 20 sites on which more than 70% of the world's photos are shared, like Blogger, Facebook, Flickr, Imgur, Instagram, LinkedIn, Medium, OnlyFans, Pinterest, PornHub, Quora, Reddit, Snapchat, TikTok, Tumblr, Wordpress, X, and YouTube."
              }
            </p>
            <p>
              ImageShield pays special attention to sites and platforms that are
              noted for their generation or distribution of abusive imagery.
            </p>
          </AccordionItem>

          <AccordionItem
            value="how-tell"
            question="How does ImageShield tell me where my likeness is being used?"
          >
            {
              "When ImageShield finds the possible use of your likeness or that of a family member, we'll alert you. We'll also report that to you in the Reports tab of the app."
            }
          </AccordionItem>

          <AccordionItem
            value="compensation"
            question="Will ImageShield pursue compensation on my behalf for an instance of my likeness being used commercially without my approval?"
          >
            {
              "Currently ImageShield cannot help users to pursue remuneration for the unauthorized commercial abuse of their image. In the future we may offer remediation services to ImageShield users so that we can pursue payment on users' behalf."
            }
          </AccordionItem>
        </Accordion>
      </section>
    </>
  );
}
