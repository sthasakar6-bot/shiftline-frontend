import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

const KVK_LENGTH = 8;

const BUSINESS_TYPES = ["BV", "VOF", "Eenmanszaak", "NV", "Maatschap", "CV", "Stichting", "Vereniging"];

const INDUSTRIES = [
  "Retail",
  "Hospitality & Catering",
  "Restaurants & Cafes",
  "Hotels & Accommodation",
  "Healthcare",
  "Logistics & Transport",
  "Warehousing",
  "Construction",
  "Manufacturing",
  "Cleaning Services",
  "Bakery & Food Production",
  "Supermarkets & Grocery",
  "Beauty & Wellness",
  "Education",
  "Agriculture",
  "Automotive",
  "IT & Technology",
  "Finance & Insurance",
  "Real Estate",
  "Entertainment & Events",
  "Security Services",
  "Sports & Recreation",
  "Non-profit",
];

const OTHER_VALUE = "__other__";

export interface CompanyDetailsState {
  kvkNumber: string;
  vatNumber: string;
  businessType: string;
  industry: string;
  estimatedEmployeeCount: string;
  companyEmail: string;
  companyPhone: string;
  addressStreet: string;
  addressNumber: string;
  addressPostcode: string;
  addressCity: string;
  countryOfRegistration: string;
  billingAddressSameAsBusiness: boolean;
  billingAddress: string;
}

export const EMPTY_COMPANY_DETAILS: CompanyDetailsState = {
  kvkNumber: "",
  vatNumber: "",
  businessType: "",
  industry: "",
  estimatedEmployeeCount: "",
  companyEmail: "",
  companyPhone: "",
  addressStreet: "",
  addressNumber: "",
  addressPostcode: "",
  addressCity: "",
  countryOfRegistration: "",
  billingAddressSameAsBusiness: true,
  billingAddress: "",
};

// The backend always wants one composed billingAddress string -- computed
// from the business address when the "same as" box is checked, or the
// separately-typed value otherwise.
export function resolveBillingAddress(details: CompanyDetailsState): string {
  if (details.billingAddressSameAsBusiness) {
    return [details.addressStreet, details.addressNumber, details.addressPostcode, details.addressCity, details.countryOfRegistration]
      .filter(Boolean)
      .join(", ");
  }
  return details.billingAddress;
}

interface Props {
  values: CompanyDetailsState;
  onChange: (values: CompanyDetailsState) => void;
}

export default function CompanyDetailsFields({ values, onChange }: Props) {
  const { t } = useTranslation();
  const [businessTypeIsOther, setBusinessTypeIsOther] = useState(
    () => values.businessType !== "" && !BUSINESS_TYPES.includes(values.businessType),
  );
  const [industryIsOther, setIndustryIsOther] = useState(
    () => values.industry !== "" && !INDUSTRIES.includes(values.industry),
  );

  function set<K extends keyof CompanyDetailsState>(key: K, value: CompanyDetailsState[K]) {
    onChange({ ...values, [key]: value });
  }

  function handleKvkChange(e: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, KVK_LENGTH);
    set("kvkNumber", digitsOnly);
  }

  function handleEmployeeCountChange(e: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    set("estimatedEmployeeCount", digitsOnly);
  }

  const kvkError =
    values.kvkNumber.length > 0 && values.kvkNumber.length !== KVK_LENGTH
      ? t("companyDetails.kvkLengthError", { count: KVK_LENGTH })
      : null;

  return (
    <>
      <h2 className="auth-section-title">{t("companyDetails.companyInfoTitle")}</h2>
      <label>
        {t("companyDetails.kvkNumber")}
        <input
          value={values.kvkNumber}
          onChange={handleKvkChange}
          inputMode="numeric"
          maxLength={KVK_LENGTH}
          required
        />
      </label>
      {kvkError && <p className="field-error">{kvkError}</p>}
      <div className="auth-form-row">
        <label className="field">
          <span className="field-label">{t("companyDetails.vatNumber")}</span>
          <input value={values.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">{t("companyDetails.businessType")}</span>
          <select
            value={businessTypeIsOther ? OTHER_VALUE : values.businessType}
            onChange={(e) => {
              if (e.target.value === OTHER_VALUE) {
                setBusinessTypeIsOther(true);
                set("businessType", "");
              } else {
                setBusinessTypeIsOther(false);
                set("businessType", e.target.value);
              }
            }}
            required
          >
            <option value="" disabled>
              {t("companyDetails.selectPlaceholder")}
            </option>
            {BUSINESS_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={OTHER_VALUE}>{t("companyDetails.other")}</option>
          </select>
          {businessTypeIsOther && (
            <input
              className="field-other-input"
              value={values.businessType}
              onChange={(e) => set("businessType", e.target.value)}
              placeholder={t("companyDetails.specifyOther")}
              required
            />
          )}
        </label>
      </div>
      <div className="auth-form-row">
        <label className="field">
          <span className="field-label">{t("companyDetails.industry")}</span>
          <select
            value={industryIsOther ? OTHER_VALUE : values.industry}
            onChange={(e) => {
              if (e.target.value === OTHER_VALUE) {
                setIndustryIsOther(true);
                set("industry", "");
              } else {
                setIndustryIsOther(false);
                set("industry", e.target.value);
              }
            }}
            required
          >
            <option value="" disabled>
              {t("companyDetails.selectPlaceholder")}
            </option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={OTHER_VALUE}>{t("companyDetails.other")}</option>
          </select>
          {industryIsOther && (
            <input
              className="field-other-input"
              value={values.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder={t("companyDetails.specifyOther")}
              required
            />
          )}
        </label>
        <label className="field">
          <span className="field-label">{t("companyDetails.employeeCount")}</span>
          <input
            type="text"
            inputMode="numeric"
            value={values.estimatedEmployeeCount}
            onChange={handleEmployeeCountChange}
            required
          />
        </label>
      </div>

      <h2 className="auth-section-title">{t("companyDetails.companyContactTitle")}</h2>
      <div className="auth-form-row">
        <label className="field">
          <span className="field-label">{t("companyDetails.companyEmail")}</span>
          <input
            type="email"
            value={values.companyEmail}
            onChange={(e) => set("companyEmail", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t("companyDetails.companyPhone")}</span>
          <input
            type="tel"
            value={values.companyPhone}
            onChange={(e) => set("companyPhone", e.target.value)}
            required
          />
        </label>
      </div>

      <h2 className="auth-section-title">{t("companyDetails.addressTitle")}</h2>
      <div className="auth-form-row">
        <label className="field" style={{ flex: 2 }}>
          <span className="field-label">{t("companyDetails.street")}</span>
          <input value={values.addressStreet} onChange={(e) => set("addressStreet", e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">{t("companyDetails.houseNumber")}</span>
          <input value={values.addressNumber} onChange={(e) => set("addressNumber", e.target.value)} required />
        </label>
      </div>
      <div className="auth-form-row">
        <label className="field">
          <span className="field-label">{t("companyDetails.postcode")}</span>
          <input
            value={values.addressPostcode}
            onChange={(e) => set("addressPostcode", e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t("companyDetails.city")}</span>
          <input value={values.addressCity} onChange={(e) => set("addressCity", e.target.value)} required />
        </label>
      </div>
      <label>
        {t("companyDetails.country")}
        <input
          value={values.countryOfRegistration}
          onChange={(e) => set("countryOfRegistration", e.target.value)}
          required
        />
      </label>

      <label className="auth-checkbox-row">
        <input
          type="checkbox"
          checked={values.billingAddressSameAsBusiness}
          onChange={(e) => set("billingAddressSameAsBusiness", e.target.checked)}
        />
        {t("companyDetails.billingSameAsBusiness")}
      </label>
      {!values.billingAddressSameAsBusiness && (
        <label>
          {t("companyDetails.billingAddress")}
          <input
            value={values.billingAddress}
            onChange={(e) => set("billingAddress", e.target.value)}
            required
          />
        </label>
      )}
    </>
  );
}
