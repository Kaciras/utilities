import { defineSuite } from "esbench";
import { escapeHTML, unescapeHTML } from "../../src/codec.ts";

const html = "<nav class=\"_nav_1hgjd_24\"><h1>Suite</h1><a class=\"_link_1hgjd_36 _active_1hgjd_43\" href=\"#.%2Fweb%2Fclone-html.js\">./web/clone-html.js</a></nav><div class=\"_container_19eez_2 _report_1hgjd_31\"><h1 class=\"_title_19eez_10\">./web/clone-html.js</h1><section class=\"_main_19eez_16\"><canvas style=\"display: block; box-sizing: border-box; height: 418px; width: 836px;\" width=\"1045\" height=\"522\"></canvas></section><!----><section class=\"_vars_19eez_46\"><h2 class=\"_title_19eez_10\">Variables</h2><label class=\"_label_v2bq0_2 _variable_19eez_56 _active_19eez_61\">Name <div class=\"_container_1sr7o_2 _select_v2bq0_8\"><select class=\"_select_1sr7o_11\" disabled=\"\"><option>innerHTML</option><option>&lt;template&gt;</option></select><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\" stroke=\"none\" class=\"tabler-icon tabler-icon-caret-down-filled _icon_1sr7o_26\"><path d=\"M18 9c.852 0 1.297 .986 .783 1.623l-.076 .084l-6 6a1 1 0 0 1 -1.32 .083l-.094 -.083l-6 -6l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057v-.118l.005 -.058l.009 -.06l.01 -.052l.032 -.108l.027 -.067l.07 -.132l.065 -.09l.073 -.081l.094 -.083l.077 -.054l.096 -.054l.036 -.017l.067 -.027l.108 -.032l.053 -.01l.06 -.01l.057 -.004l12.059 -.002z\"></path></svg></div></label><label class=\"_label_v2bq0_2 _variable_19eez_56\">Executor <div class=\"_container_1sr7o_2 _select_v2bq0_8\"><select class=\"_select_1sr7o_11\"><option>firefox</option><option>webkit</option><option>chromium</option></select><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\" stroke=\"none\" class=\"tabler-icon tabler-icon-caret-down-filled _icon_1sr7o_26\"><path d=\"M18 9c.852 0 1.297 .986 .783 1.623l-.076 .084l-6 6a1 1 0 0 1 -1.32 .083l-.094 -.083l-6 -6l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057v-.118l.005 -.058l.009 -.06l.01 -.052l.032 -.108l.027 -.067l.07 -.132l.065 -.09l.073 -.081l.094 -.083l.077 -.054l.096 -.054l.036 -.017l.067 -.027l.108 -.032l.053 -.01l.06 -.01l.057 -.004l12.059 -.002z\"></path></svg></div></label><label class=\"_label_v2bq0_2 _variable_19eez_56\">Builder <div class=\"_container_1sr7o_2 _select_v2bq0_8\"><select class=\"_select_1sr7o_11\"><option>Vite</option></select><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\" stroke=\"none\" class=\"tabler-icon tabler-icon-caret-down-filled _icon_1sr7o_26\"><path d=\"M18 9c.852 0 1.297 .986 .783 1.623l-.076 .084l-6 6a1 1 0 0 1 -1.32 .083l-.094 -.083l-6 -6l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057v-.118l.005 -.058l.009 -.06l.01 -.052l.032 -.108l.027 -.067l.07 -.132l.065 -.09l.073 -.081l.094 -.083l.077 -.054l.096 -.054l.036 -.017l.067 -.027l.108 -.032l.053 -.01l.06 -.01l.057 -.004l12.059 -.002z\"></path></svg></div></label></section></div>";

export default defineSuite({
	baseline: { type: "impl", value: "Regex" },
	params: {
		impl: ["DOM", "Regex"],
	},
	setup(scene) {
		if (scene.params.impl === "DOM") {
			const div = document.createElement("div");

			scene.bench("escape", () => {
				div.textContent = html;
				return div.innerHTML;
			});
			scene.bench("unescape", () => {
				div.innerHTML = html;
				return div.textContent;
			});
		} else {
			scene.bench("escape", () => escapeHTML(html));
			scene.bench("unescape", () => unescapeHTML(html));
		}
	},
});
