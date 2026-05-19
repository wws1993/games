import './home.scss';

const HOME_ASSETS = {
  background: '/img/home/bg.png',
  mascot: '/img/home/core.png',
  coin: '/img/home/coin.png',
  button: '/img/home/btn.png',
  sideCard: '/img/home/btn2.png',
} as const;

const HOME_COPY = {
  title: '牛牛大乐斗',
  coinLabel: '金币666',
  activityLabel: '活动中心',
  startLabel: '开始游戏',
} as const;

/** 首页，展示主视觉与核心入口。 */
export default function HomePage() {
  /** 占位点击，后续可接入活动中心流程。 */
  const handleActivity = () => {
    return undefined;
  };

  /** 占位点击，后续可接入开始游戏流程。 */
  const handleStart = () => {
    return undefined;
  };

  return <main className="home-page">
    <div
      className="home-page__frame"
      style={{ backgroundImage: `url(${HOME_ASSETS.background})` }}
    >
      <header className="home-page__header">
        <div className="home-page__title-banner">
          <h1 className="home-page__title">{HOME_COPY.title}</h1>
        </div>
      </header>

      <section className="home-page__content">
        <div
          aria-label={HOME_COPY.coinLabel}
          className="home-page__coin-bar"
          style={{ backgroundImage: `url(${HOME_ASSETS.button})` }}
        >
          <img
            alt=""
            className="home-page__coin-icon"
            src={HOME_ASSETS.coin}
          />
          <span className="home-page__coin-text">{HOME_COPY.coinLabel}</span>
        </div>

        <button
          aria-label={HOME_COPY.activityLabel}
          className="home-page__activity"
          onClick={handleActivity}
          style={{ backgroundImage: `url(${HOME_ASSETS.sideCard})` }}
          type="button"
        >
          <span className="home-page__activity-text">{HOME_COPY.activityLabel}</span>
        </button>

        <div className="home-page__mascot-wrap">
          <img
            alt="首页牛牛形象"
            className="home-page__mascot"
            src={HOME_ASSETS.mascot}
          />
        </div>
      </section>

      <footer className="home-page__footer">
        <button
          className="home-page__start"
          onClick={handleStart}
          style={{ backgroundImage: `url(${HOME_ASSETS.button})` }}
          type="button"
        >
          <span className="home-page__start-text">{HOME_COPY.startLabel}</span>
        </button>
      </footer>
    </div>
  </main>;
}
