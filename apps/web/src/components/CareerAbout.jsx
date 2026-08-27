import { Mail, Phone, MapPin, Globe, Linkedin, Sparkles, BadgeCheck, Trophy } from 'lucide-react'

const STATIC_CONTACT = {
  name: 'Aakash Manandhar',
  profession: 'Data Engineer',
  location: 'Uppsala, Sweden',
  phone: '+46-0766351436',
  email: 'aakashmanandhar@gmail.com',
  site: 'https://aakashmanandhar.tech/',
  linkedin: 'https://www.linkedin.com/in/aakashmanandhar/',
}

function CareerAbout({ profile, expertise, achievements }) {
  const hasHeadshot = !!profile?.headshot

  return (
    <div className="cv-about-card">
      <div className="cv-about-header">
        <div className="cv-about-photo-wrap">
          {hasHeadshot ? (
            <img src={profile.headshot} alt={STATIC_CONTACT.name} className="cv-about-photo" />
          ) : (
            <div className="cv-about-photo cv-about-photo-fallback">
              {STATIC_CONTACT.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>
        <div className="cv-about-header-text">
          <h1 className="cv-about-name">{STATIC_CONTACT.name}</h1>
          <div className="cv-about-profession-badge">
            <BadgeCheck size={13} />
            {STATIC_CONTACT.profession}
          </div>
        </div>
        <div className="cv-about-contact-row">
          <a href={`mailto:${STATIC_CONTACT.email}`} className="cv-contact-chip">
            <Mail size={12} /> {STATIC_CONTACT.email}
          </a>
          <span className="cv-contact-chip">
            <Phone size={12} /> {STATIC_CONTACT.phone}
          </span>
          <span className="cv-contact-chip">
            <MapPin size={12} /> {STATIC_CONTACT.location}
          </span>
          <a href={STATIC_CONTACT.site} target="_blank" rel="noopener noreferrer" className="cv-contact-chip">
            <Globe size={12} /> aakashmanandhar.tech
          </a>
          <a href={STATIC_CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className="cv-contact-chip">
            <Linkedin size={12} /> LinkedIn
          </a>
        </div>
      </div>

      {profile?.summary && (
        <div className="cv-about-summary-wrap">
          <span className="cv-about-summary-quote">&#8221;</span>
          <p className="cv-about-summary">{profile.summary}</p>
        </div>
      )}

      {achievements?.length > 0 && (
        <div className="cv-achievements">
          <div className="cv-achievements-label">
            <span className="cv-expertise-icon-badge"><Trophy size={12} /></span>
            Key Achievements
          </div>
          <div className="cv-achievements-grid">
            {achievements.map((a) => (
              <div key={a.id} className="cv-achievement-card">
                <div className="cv-achievement-title">{a.title}</div>
                <div className="cv-achievement-desc">{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expertise?.length > 0 && (
        <div className="cv-about-expertise">
          <div className="cv-about-expertise-label">
            <span className="cv-expertise-icon-badge"><Sparkles size={12} /></span>
            Areas of Expertise
          </div>
          <div className="cv-expertise-grid">
            {expertise.map((e, i) => (
              <div key={i} className="cv-expertise-row">
                <span className="cv-expertise-dot" />
                {e.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CareerAbout
