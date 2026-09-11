export default function ModulePage({ eyebrow, title, description, action, count, countLabel, columns, records, renderRow, emptyTitle, emptyBody, nextFeature }) {
  return (
    <div className="productPage">
      <div className="pageHeading"><div><p className="pageEyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><button className="primaryAction" type="button" disabled title="This workflow will be implemented in the next feature phase">{action} <span>+</span></button></div>
      <div className="moduleToolbar"><div><strong>{count}</strong><span>{countLabel}</span></div><label className="moduleSearch"><span>&#9906;</span><input aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}`} disabled /></label><button type="button" disabled>Filter</button></div>
      <section className="dataSurface">
        <div className="dataHeader">{columns.map((column) => <span key={column}>{column}</span>)}</div>
        {records.length ? <div className="dataRows">{records.map(renderRow)}</div> : <div className="emptyState"><div className="emptyMark"><span /><span /><span /></div><small>NO RECORDS YET</small><h2>{emptyTitle}</h2><p>{emptyBody}</p><div className="phasePill"><b>NEXT FEATURE</b><span>{nextFeature}</span></div></div>}
      </section>
    </div>
  );
}
