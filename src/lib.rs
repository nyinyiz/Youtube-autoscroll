use wasm_bindgen::prelude::*;
use web_sys::{window, HtmlVideoElement};

#[wasm_bindgen]
pub struct Scroller {
    active: bool,
    speed: f64,
    last_tick: f64,
}

#[wasm_bindgen]
impl Scroller {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            active: false,
            speed: 2.0,
            last_tick: 0.0,
        }
    }

    pub fn set_active(&mut self, active: bool) {
        self.active = active;
        if !active {
            self.last_tick = 0.0;
        }
    }

    pub fn set_speed(&mut self, speed: f64) {
        self.speed = speed;
    }

    pub fn tick(&mut self, timestamp: f64) {
        if !self.active {
            return;
        }

        if self.is_video_paused() {
            self.last_tick = 0.0;
            return;
        }

        let delta = if self.last_tick == 0.0 {
            1.0
        } else {
            (timestamp - self.last_tick) / 16.66 // Normalize to 60fps
        };
        self.last_tick = timestamp;

        self.perform_scroll(self.speed * delta);
    }

    fn is_video_paused(&self) -> bool {
        let window = window().expect("no global window");
        let document = window.document().expect("should have a document");
        
        if let Ok(Some(video)) = document.query_selector("video.html5-main-video") {
            if let Ok(video_el) = video.dyn_into::<HtmlVideoElement>() {
                // Stop scrolling if paused OR ended
                return video_el.paused() || video_el.ended();
            }
        }
        false
    }

    fn perform_scroll(&self, amount: f64) {
        let window = window().expect("no global window");
        let document = window.document().expect("should have a document");
        let html = document.document_element().expect("should have documentElement");

        let scroll_top = window.scroll_y().unwrap_or(0.0);
        let scroll_height = html.scroll_height() as f64;
        let client_height = html.client_height() as f64;

        // Stop if we reached the bottom (within a 10px threshold)
        if scroll_top + client_height >= scroll_height - 10.0 {
            return;
        }

        window.scroll_by_with_x_and_y(0.0, amount);
    }
}
