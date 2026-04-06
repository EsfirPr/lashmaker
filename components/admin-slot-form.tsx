import { addTimeSlotAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { getTodayDate } from "@/lib/utils";

export function AdminSlotForm() {
  return (
    <form className="form-grid" action={addTimeSlotAction}>
      <div className="field">
        <label htmlFor="slotDate">Дата</label>
        <input id="slotDate" name="slotDate" type="date" min={getTodayDate()} required />
      </div>

      <div className="field">
        <label htmlFor="timeRanges">Несколько окон сразу</label>
        <textarea
          id="timeRanges"
          name="timeRanges"
          placeholder={"09:00-10:30\n11:00-12:30\n14:00-15:30"}
        />
      </div>

      <p className="helper">
        Можно ввести несколько интервалов по одному на строку. Если поле пустое, будет использована
        форма ниже для одного окна.
      </p>

      <div className="two-columns">
        <div className="field">
          <label htmlFor="startTime">Начало</label>
          <input id="startTime" name="startTime" type="time" />
        </div>
        <div className="field">
          <label htmlFor="endTime">Окончание</label>
          <input id="endTime" name="endTime" type="time" />
        </div>
      </div>
      <SubmitButton>Добавить окно</SubmitButton>
    </form>
  );
}
