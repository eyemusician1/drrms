import { NCR_PROVINCE_KEY, NCR_REGION_CODE } from './philippinesGeo';

export const toPickerValue = (record = {}) => {
  const provinceCode = record.province_code || '';
  return {
    provinceCode: provinceCode === NCR_REGION_CODE ? NCR_PROVINCE_KEY : provinceCode,
    cityMunicipalityCode: record.city_municipality_code || '',
    cityMunicipalityType: record.city_municipality_type || '',
    barangayCode: record.barangay_code || '',
    label: record.location || record.region || '',
  };
};

export const locationFieldsFromDetail = (detail) => {
  if (!detail) {
    return {
      province_code: null,
      city_municipality_code: null,
      city_municipality_type: null,
      barangay_code: null,
    };
  }
  return {
    province_code: detail.province_code || null,
    city_municipality_code: detail.city_municipality_code || null,
    city_municipality_type: detail.city_municipality_type || null,
    barangay_code: detail.barangay_code || null,
  };
};
