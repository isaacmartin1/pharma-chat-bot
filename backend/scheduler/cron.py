from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


def start_scheduler():
    # brand_asset_collection_service is owned by another agent; import lazily
    # so a missing/broken file does not prevent the app from starting.
    try:
        from services.brand_asset_collection_service import run_scheduled_crawl
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "brand_asset_collection_service unavailable — crawl job not scheduled: %s", exc
        )
        return

    scheduler.add_job(
        run_scheduled_crawl,
        CronTrigger(hour=2, minute=0),  # 2 am daily
        id="brand_asset_crawl",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
