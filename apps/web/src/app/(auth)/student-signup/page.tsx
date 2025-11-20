'use client';

export default function StudentSignupPage() {
  return (
    <>
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
          <div className="p-6 border-b-2 border-base-content/10">
            <h1 className="text-3xl font-black uppercase tracking-tight text-base-content mb-2">
              Børn Kan Ikke Tilmelde Sig Selv
            </h1>
            <div className="h-1 w-24 bg-warning mt-2"></div>
          </div>

          <div className="p-8 space-y-6">
            <div className="bg-warning/10 border-2 border-warning p-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-base-content mb-4">
                Af Sikkerhedsmæssige Årsager
              </h2>
              <p className="text-sm text-base-content/70 mb-4">
                Børn kan ikke oprette deres egne konti. Din forælder eller værge skal oprette kontoen for dig.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-base-content">
                Sådan Får Du En Konto
              </h3>
              
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-content font-black flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Bed din forælder om at logge ind på KlasseChatten
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-content font-black flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Din forælder skal gå til "Opret Barn Konto"
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-content font-black flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Din forælder opretter en konto med dit navn og et brugernavn
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-content font-black flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <p className="text-sm font-medium text-base-content">
                      Du kan derefter logge ind med dit brugernavn og adgangskode
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-info/10 border-l-4 border-info p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-base-content mb-2">
                Bemærk
              </p>
              <p className="text-xs text-base-content/70">
                Du skal bruge dit <strong>brugernavn</strong> til at logge ind, ikke en email adresse.
              </p>
            </div>

            <div className="flex justify-center">
              <a
                href="/login"
                className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
              >
                Gå Til Login
              </a>
            </div>
          </div>
        </div>
    </>
  );
}
