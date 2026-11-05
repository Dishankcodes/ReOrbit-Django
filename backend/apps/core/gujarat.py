"""Cities ReOrbit serves. Keep in sync with frontend/src/shared/data/gujaratCities.js."""

GUJARAT_CITIES = {
    "Ahmedabad": "Ahmedabad",
    "Surat": "Surat",
    "Vadodara": "Vadodara",
    "Rajkot": "Rajkot",
    "Bhavnagar": "Bhavnagar",
    "Jamnagar": "Jamnagar",
    "Gandhinagar": "Gandhinagar",
    "Junagadh": "Junagadh",
    "Anand": "Anand",
    "Navsari": "Navsari",
    "Morbi": "Morbi",
    "Gandhidham": "Kutch",
    "Nadiad": "Kheda",
    "Bharuch": "Bharuch",
    "Palanpur": "Banaskantha",
    "Patan": "Patan",
    "Porbandar": "Porbandar",
    "Mehsana": "Mehsana",
    "Bhuj": "Kutch",
    "Veraval": "Gir Somnath",
    "Vapi": "Valsad",
    "Valsad": "Valsad",
    "Godhra": "Panchmahal",
    "Surendranagar": "Surendranagar",
    "Amreli": "Amreli",
    "Gondal": "Rajkot",
    "Botad": "Botad",
    "Kalol": "Gandhinagar",
    "Himmatnagar": "Sabarkantha",
}

_BY_LOWER = {name.lower(): name for name in GUJARAT_CITIES}


def canonical_city(value):
    """Return the properly spelled city name, or None if it is not a served city."""
    return _BY_LOWER.get(str(value or "").strip().lower())
