#!/usr/bin/env python3
"""把 radio.garden 的 places 数据转成 web/src/assets/city-anchors.json 格式。

输入：/tmp/rg2.json（radio.garden /api/ara/content/places 的响应，已带浏览器头抓取）
输出：city-anchors.json，格式 { cc: [[cityName, lng, lat, weight], ...] }，按 weight 降序。

坐标是静态事实数据，一次性导入，不构成对 radio.garden 的运行时依赖。
"""
import json
import re
import sys

# 英文国名 -> ISO 3166-1 alpha-2（覆盖 radio.garden 全部 228 个）
EN_TO_CC = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS",
    "Andorra": "AD", "Angola": "AO", "Anguilla": "AI", "Antigua and Barbuda": "AG",
    "Argentina": "AR", "Armenia": "AM", "Aruba": "AW", "Australia": "AU", "Austria": "AT",
    "Azerbaijan": "AZ", "Azores": "PT", "Bahrain": "BH", "Bailiwick of Guernsey": "GG",
    "Bailiwick of Jersey": "JE", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY",
    "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bermuda": "BM", "Bhutan": "BT",
    "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR",
    "British Indian Ocean Territory": "IO", "British Virgin Islands": "VG", "Brunei": "BN",
    "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cambodia": "KH",
    "Cameroon": "CM", "Canada": "CA", "Canary Islands": "ES", "Cape Verde": "CV",
    "Cayman Islands": "KY", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
    "China": "CN", "Christmas Island": "CX", "Cocos (Keeling) Islands": "CC", "Colombia": "CO",
    "Comoros": "KM", "Congo": "CG", "Cook Islands": "CK", "Costa Rica": "CR",
    "Croatia": "HR", "Cuba": "CU", "Curaçao": "CW", "Cyprus": "CY", "Czech Republic": "CZ",
    "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO",
    "DR Congo": "CD", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV",
    "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini": "SZ",
    "Ethiopia": "ET", "Falkland Islands": "FK", "Faroe Islands": "FO", "Fiji": "FJ",
    "Finland": "FI", "France": "FR", "French Guiana": "GF", "French Polynesia": "PF",
    "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH",
    "Gibraltar": "GI", "Greece": "GR", "Greenland": "GL", "Grenada": "GD",
    "Guadeloupe": "GP", "Guam": "GU", "Guatemala": "GT", "Guinea": "GN",
    "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT", "Honduras": "HN",
    "Hong Kong": "HK", "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID",
    "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Isle of Man": "IM", "Israel": "IL",
    "Italy": "IT", "Ivory Coast": "CI", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
    "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kosovo": "XK", "Kuwait": "KW",
    "Kyrgyzstan": "KG", "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS",
    "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT",
    "Luxembourg": "LU", "Macao": "MO", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY",
    "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH",
    "Martinique": "MQ", "Mauritania": "MR", "Mauritius": "MU", "Mayotte": "YT",
    "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN",
    "Montenegro": "ME", "Montserrat": "MS", "Morocco": "MA", "Mozambique": "MZ",
    "Myanmar": "MM", "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL",
    "New Caledonia": "NC", "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE",
    "Nigeria": "NG", "Niue": "NU", "Norfolk Island": "NF", "North Korea": "KP",
    "North Macedonia": "MK", "Northern Mariana Islands": "MP", "Norway": "NO", "Oman": "OM",
    "Pakistan": "PK", "Palau": "PW", "Palestine": "PS", "Panama": "PA",
    "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH",
    "Pitcairn Islands": "PN", "Poland": "PL", "Portugal": "PT", "Puerto Rico": "PR",
    "Qatar": "QA", "Réunion": "RE", "Romania": "RO", "Russia": "RU", "Rwanda": "RW",
    "Saint Barthélemy": "BL", "Saint Helena": "SH", "Saint Kitts and Nevis": "KN",
    "Saint Lucia": "LC", "Saint Martin": "MF", "Saint Pierre and Miquelon": "PM",
    "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM",
    "São Tomé and Príncipe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS",
    "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Sint Maarten": "SX",
    "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO",
    "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS", "Spain": "ES",
    "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Svalbard and Jan Mayen": "SJ",
    "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ",
    "Tanzania": "TZ", "Thailand": "TH", "Timor-Leste": "TL", "Togo": "TG",
    "Tokelau": "TK", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN",
    "Turkey": "TR", "Turkmenistan": "TM", "Turks and Caicos Islands": "TC", "Tuvalu": "TV",
    "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
    "United States": "US", "Uruguay": "UY", "US Virgin Islands": "VI", "Uzbekistan": "UZ",
    "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN",
    "Wallis and Futuna": "WF", "Western Sahara": "EH", "Yemen": "YE", "Zambia": "ZM",
    "Zimbabwe": "ZW",
    # 别名 / 变体（radio.garden 实际使用）
    "Czechia": "CZ", "Côte d'Ivoire": "CI", "Democratic Republic of the Congo": "CD",
    "Federated States of Micronesia": "FM", "Guiné-Bissau": "GW", "Macau": "MO",
    "Madeira": "PT", "Myanmar (Burma)": "MM", "New Calédonia": "NC",
    "Republic of the Congo": "CG", "Saint-Pierre et Miquelon": "PM", "Tahiti": "PF",
    "The Bahamas": "BS", "The Gambia": "GM", "Türkiye": "TR", "U.S. Virgin Islands": "VI",
    "Åland Islands": "AX", "Collectivity of Saint Martin": "MF",
}

# 州缩写 -> 全名（用于把 "Austin TX" 里的 TX 拆成 "Texas" 供 state 匹配）
US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

# 其它带州/地区后缀的国家的常见后缀（加拿大省缩写等，简化处理，仅剥离已知后缀）
# 这里只处理美国，其余国家 title 通常不带可识别州缩写，保持城市名全称。


def split_city_state(title, country):
    """把 'Austin TX' 拆成 (城市名, state缩写或None)。只处理美国（其它国家 title 不带州缩写）。"""
    if country == "United States":
        m = re.match(r'^(.*?)\s+([A-Z]{2})$', title.strip())
        if m and m.group(2) in US_STATES:
            return m.group(1).strip(), m.group(2)
    return title.strip(), None


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rg2.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "city-anchors.json"

    d = json.load(open(src))
    lst = d["data"]["list"]

    by_cc = {}   # cc -> { cityLower: [cityName, lng, lat, weight, stateAbbr] }
    unmapped = set()

    for p in lst:
        country = p.get("country", "")
        cc = EN_TO_CC.get(country)
        if not cc:
            unmapped.add(country)
            continue
        geo = p.get("geo")
        if not geo or len(geo) != 2 or not all(isinstance(x, (int, float)) for x in geo):
            continue
        lng, lat = geo
        title = p.get("title", "").strip()
        if not title:
            continue
        city, state = split_city_state(title, country)
        weight = int(p.get("size") or 0)  # 该地电台数，作为排序权重
        by_cc.setdefault(cc, {})
        key = city.lower()
        entry = [city, lng, lat, weight, state]
        if key not in by_cc[cc] or weight > by_cc[cc][key][3]:
            by_cc[cc][key] = entry

    # 输出格式：城市名带州缩写后缀（如 "Sacramento CA"），供前端按 state 匹配
    result = {}
    for cc, cities in by_cc.items():
        rows = []
        for city, lng, lat, w, state in cities.values():
            name = f"{city} {state}" if state else city
            rows.append([name, round(lng, 6), round(lat, 6), w])
        rows.sort(key=lambda x: (-x[3], x[0]))
        result[cc] = rows

    # 按 cc 排序输出，保证文件稳定
    ordered = {k: result[k] for k in sorted(result)}

    json.dump(ordered, open(out, "w"), ensure_ascii=False, separators=(",", ":"))

    total = sum(len(v) for v in ordered.values())
    print(f"输出 {out}: {len(ordered)} 个国家, {total} 个城市")
    if unmapped:
        print(f"未映射国家 ({len(unmapped)}): {sorted(unmapped)}")


if __name__ == "__main__":
    main()
